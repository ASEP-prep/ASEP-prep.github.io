/* Φόρτωση και έλεγχος δεδομένων από τον φάκελο data/.
   Όλες οι διαδρομές είναι σχετικές, ώστε η εφαρμογή να δουλεύει σε
   οποιαδήποτε διεύθυνση (GitHub Pages, Live Server κ.λπ.). */
(function () {
  'use strict';
  const A = window.ASEP;
  const LETTERS = ['α', 'β', 'γ', 'δ'];

  const D = {
    LETTERS,
    bank: null,            // { meta, questions }
    questions: [],
    byId: {},
    subjects: [],          // [{ no, name, file, count, ids }]
    config: null,
    sections: [],
    explanations: {},      // id -> { text, tag, basis }
    explanationFiles: [],
    warnings: []
  };

  async function getJSON(path) {
    const inline = window.ASEP_INLINE;
    if (inline && Object.prototype.hasOwnProperty.call(inline, path)) {
      return JSON.parse(JSON.stringify(inline[path]));
    }
    const res = await fetch(path, { cache: 'no-cache' });
    if (!res.ok) {
      const err = new Error(path + ': HTTP ' + res.status);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  // Έλεγχος δομής τράπεζας. Επιστρέφει { ok, errors, count }.
  function validateBank(obj) {
    const errors = [];
    const add = (m) => { if (errors.length < 15) errors.push(m); };
    if (!obj || typeof obj !== 'object') return { ok: false, errors: ['Το αρχείο δεν περιέχει αντικείμενο JSON.'], count: 0 };
    if (!obj.meta || typeof obj.meta.version !== 'string' || !obj.meta.version) add('Λείπει το meta.version (έκδοση τράπεζας).');
    if (!Array.isArray(obj.questions) || !obj.questions.length) {
      add('Λείπει ο πίνακας questions ή είναι κενός.');
      return { ok: false, errors, count: 0 };
    }
    const seen = new Set();
    obj.questions.forEach((q, i) => {
      const where = 'Ερώτηση #' + (i + 1) + (q && q.id ? ' (' + q.id + ')' : '');
      if (!q || typeof q !== 'object') return add(where + ': μη έγκυρη εγγραφή.');
      if (typeof q.id !== 'string' || !q.id) add(where + ': λείπει το id.');
      else if (seen.has(q.id)) add(where + ': διπλό id.');
      else seen.add(q.id);
      if (!Number.isInteger(q.subject_no)) add(where + ': λείπει το subject_no.');
      if (typeof q.subject !== 'string' || !q.subject) add(where + ': λείπει το subject.');
      if (typeof q.file !== 'string' || !q.file) add(where + ': λείπει το file.');
      if (!Number.isInteger(q.number)) add(where + ': λείπει ο αριθμός (number).');
      if (typeof q.question !== 'string' || !q.question.trim()) add(where + ': κενό κείμενο ερώτησης.');
      if (!q.options || typeof q.options !== 'object') add(where + ': λείπουν οι επιλογές.');
      else LETTERS.forEach((l) => {
        if (typeof q.options[l] !== 'string' || !q.options[l].trim()) add(where + ': λείπει η επιλογή ' + l + '.');
      });
      if (!LETTERS.includes(q.answer)) add(where + ': η απάντηση δεν είναι α, β, γ ή δ.');
    });
    return { ok: errors.length === 0, errors, count: obj.questions.length };
  }

  function indexBank(bank) {
    D.bank = bank;
    D.questions = bank.questions;
    D.byId = {};
    const subj = new Map();
    bank.questions.forEach((q) => {
      D.byId[q.id] = q;
      if (!subj.has(q.subject_no)) subj.set(q.subject_no, { no: q.subject_no, name: q.subject, file: q.file, count: 0, ids: [] });
      const s = subj.get(q.subject_no);
      s.count++;
      s.ids.push(q.id);
    });
    D.subjects = Array.from(subj.values()).sort((a, b) => a.no - b.no);
    D.subjects.forEach((s) => s.ids.sort((x, y) => D.byId[x].number - D.byId[y].number));
  }

  function subjectByNo(no) {
    return D.subjects.find((s) => s.no === no) || null;
  }

  // Ετικέτα πηγής: "2_ΔΙΟΙΚΗΤΙΚΟ_ΔΙΚΑΙΟ, ερ. 14"
  function sourceLabel(q) {
    return String(q.file).replace(/\.pdf$/i, '') + ', ερ. ' + q.number;
  }

  async function loadExplanations() {
    D.explanations = {};
    D.explanationFiles = [];
    let index;
    try {
      index = await getJSON('data/explanations/index.json');
    } catch (e) {
      return; // προαιρετικό
    }
    const files = Array.isArray(index.files) ? index.files : [];
    for (const f of files) {
      if (!f || typeof f.file !== 'string') continue;
      try {
        const data = await getJSON('data/explanations/' + f.file);
        const items = data && data.items ? data.items : {};
        let n = 0;
        Object.keys(items).forEach((id) => {
          const it = items[id];
          if (!it || typeof it.text !== 'string') return;
          const tag = it.tag === 'ΑΒΕΒΑΙΟ' ? 'ΑΒΕΒΑΙΟ' : 'ΓΝΩΣΗ';
          D.explanations[id] = { text: it.text, tag, basis: typeof it.basis === 'string' ? it.basis : '' };
          n++;
        });
        D.explanationFiles.push({ file: f.file, version: (data.meta && data.meta.version) || f.version || '', count: n });
      } catch (e) {
        D.warnings.push('Δεν φορτώθηκε το αρχείο επεξηγήσεων ' + f.file + '.');
      }
    }
  }

  async function load() {
    D.warnings = [];
    const [bank, config, sections] = await Promise.all([
      getJSON('data/bank.json'),
      getJSON('data/exam-config.json'),
      getJSON('data/sections.json').catch(() => ({ sections: [] }))
    ]);
    const check = validateBank(bank);
    if (!check.ok) {
      throw new Error('Η ενσωματωμένη τράπεζα δεν πέρασε τον έλεγχο: ' + check.errors.join(' '));
    }
    D.config = config;
    D.sections = Array.isArray(sections.sections) ? sections.sections : [];
    // Η τράπεζα έρχεται μόνο από το data/bank.json της εφαρμογής (όχι από αρχείο του χρήστη),
    // ώστε κανείς να μη μπορεί να «περάσει» ψεύτικη τράπεζα με λάθος απαντήσεις.
    indexBank(bank);

    await loadExplanations();
    return D;
  }

  Object.assign(D, { load, validateBank, subjectByNo, sourceLabel, getJSON });
  A.data = D;
})();
