/* Εξέταση Γνώσεων – δεδομένα προόδου, κανόνες εξέτασης, βαθμολόγηση.
   Κλειδιά αποθήκευσης (με πρόθεμα asep-prep:):
     knowledge:progress  { schema, q: { id: { a, c, l, t, h } } }
        a = προσπάθειες, c = σωστές, l = τελευταία σωστή (1/0), t = χρόνος, h = hash ερώτησης
     knowledge:history   [ αποτελέσματα εξετάσεων, νεότερο πρώτο ]
     knowledge:settings  { practiceShuffle, exam: { base_version, values } }
     knowledge:session   εξέταση σε εξέλιξη (δεν εξάγεται) */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const K_PROG = 'knowledge:progress';
  const K_HIST = 'knowledge:history';
  const K_SET = 'knowledge:settings';
  const K_SESS = 'knowledge:session';
  const HISTORY_MAX = 200;

  let prog = null;
  const hashes = {};

  function qHash(q) {
    if (!hashes[q.id]) {
      const o = q.options;
      hashes[q.id] = U.hash(q.question + '|' + o['α'] + '|' + o['β'] + '|' + o['γ'] + '|' + o['δ'] + '|' + q.answer);
    }
    return hashes[q.id];
  }
  function resetHashes() { Object.keys(hashes).forEach((k) => delete hashes[k]); }

  function progress() {
    if (!prog) {
      prog = A.store.getClean(K_PROG, null);
      if (!prog || typeof prog.q !== 'object') prog = { schema: 1, q: {} };
    }
    return prog;
  }
  function saveProgress() { A.store.set(K_PROG, progress()); }
  function reload() { prog = null; resetHashes(); }

  // Εγγραφή για ερώτηση, μόνο αν η ερώτηση δεν άλλαξε από τότε.
  function entry(q) {
    const e = progress().q[q.id];
    return e && e.h === qHash(q) ? e : null;
  }

  function record(q, correct) {
    const p = progress();
    let e = entry(q);
    if (!e) e = { a: 0, c: 0, l: 0, t: 0, h: qHash(q) };
    e.a += 1;
    if (correct) e.c += 1;
    e.l = correct ? 1 : 0;
    e.t = Date.now();
    p.q[q.id] = e;
    saveProgress();
  }

  function subjectStats(s) {
    let seen = 0, attempts = 0, correct = 0, wrongNow = 0;
    s.ids.forEach((id) => {
      const e = entry(A.data.byId[id]);
      if (!e) return;
      seen++;
      attempts += e.a;
      correct += e.c;
      if (e.l === 0) wrongNow++;
    });
    return { seen, attempts, correct, wrongNow, total: s.count };
  }

  function totals() {
    const t = { seen: 0, attempts: 0, correct: 0, wrongNow: 0, total: 0 };
    A.data.subjects.forEach((s) => {
      const x = subjectStats(s);
      Object.keys(t).forEach((k) => { t[k] += x[k]; });
    });
    return t;
  }

  // Ερωτήσεις των οποίων η τελευταία απάντηση ήταν λάθος.
  function wrongIds(ids) {
    return ids.filter((id) => { const e = entry(A.data.byId[id]); return e && e.l === 0; });
  }
  function unseenIds(ids) {
    return ids.filter((id) => !entry(A.data.byId[id]));
  }
  function mostMissed(limit) {
    const list = [];
    A.data.questions.forEach((q) => {
      const e = entry(q);
      if (e && e.a - e.c > 0) list.push({ id: q.id, miss: e.a - e.c, a: e.a, l: e.l });
    });
    list.sort((x, y) => y.miss - x.miss || x.l - y.l);
    return list.slice(0, limit || 10);
  }
  function staleCount() {
    const p = progress();
    let n = 0;
    Object.keys(p.q).forEach((id) => {
      const q = A.data.byId[id];
      if (!q || p.q[id].h !== qHash(q)) n++;
    });
    return n;
  }

  /* ---------- Ρυθμίσεις ---------- */
  function settings() {
    const s = A.store.getClean(K_SET, {}) || {};
    return { practiceShuffle: !!s.practiceShuffle, exam: s.exam && typeof s.exam === 'object' ? s.exam : null };
  }
  function saveSettings(s) { A.store.set(K_SET, s); }

  const RULE_KEYS = ['questions', 'time_minutes', 'allow_back', 'penalty_fraction', 'base_score', 'selection', 'shuffle_options'];

  function defaultRules() {
    return Object.assign({}, A.data.config.knowledge);
  }
  // Ενεργοί κανόνες = προεπιλογές αρχείου + αλλαγές του χρήστη.
  function rules() {
    const r = defaultRules();
    const s = settings();
    if (s.exam && s.exam.values) {
      RULE_KEYS.forEach((k) => { if (k in s.exam.values) r[k] = s.exam.values[k]; });
    }
    r.questions = Math.max(1, Math.min(parseInt(r.questions, 10) || 25, A.data.questions.length));
    r.time_minutes = Math.max(1, Math.min(Number(r.time_minutes) || 25, 600));
    r.penalty_fraction = Math.max(0, Math.min(Number(r.penalty_fraction) || 0, 1));
    r.base_score = r.base_score === null || r.base_score === '' || r.base_score === undefined ? null : Number(r.base_score);
    r.max_score = Number(r.max_score) || 100;
    return r;
  }
  function hasCustomRules() {
    const s = settings();
    return !!(s.exam && s.exam.values && Object.keys(s.exam.values).length);
  }
  // Οι προεπιλογές του αρχείου άλλαξαν μετά τις αλλαγές του χρήστη;
  function customRulesOutdated() {
    const s = settings();
    return hasCustomRules() && s.exam.base_version !== A.data.config.version;
  }
  function setCustomRules(values) {
    const s = settings();
    const def = defaultRules();
    const diff = {};
    RULE_KEYS.forEach((k) => { if (k in values && values[k] !== def[k]) diff[k] = values[k]; });
    s.exam = Object.keys(diff).length ? { base_version: A.data.config.version, values: diff } : null;
    saveSettings(s);
  }

  /* ---------- Σειρά επιλογών ----------
     Με ανακάτεμα, μια επιλογή που παραπέμπει στη θέση των άλλων («Όλα τα παραπάνω»,
     «Κανένα από τα παραπάνω») μένει στη θέση της· οι υπόλοιπες ανακατεύονται.
     Οι διατυπώσεις «λοιπές/υπόλοιπες απαντήσεις» δεν εξαρτώνται από τη θέση. */
  const POSITIONAL = /(όλ(α|ες|οι)\s+(τα|οι)\s+(παραπάνω|ανωτέρω)|(κανέν(α|ας)|καμία)\s+από\s+(τα|τις|τους)\s+(παραπάνω|ανωτέρω)|(παραπάνω|ανωτέρω)\s+(απαντ|επιλογ|προτάσ))/i;
  function optionOrder(q, shuffle) {
    const L = A.data.LETTERS;
    if (!shuffle) return L.slice();
    const fixed = L.map((l) => POSITIONAL.test(q.options[l] || ''));
    const movable = U.shuffle(L.filter((l, i) => !fixed[i]));
    return L.map((l, i) => (fixed[i] ? l : movable.shift()));
  }

  /* ---------- Επιλογή ερωτήσεων εξέτασης ---------- */
  function pickExamIds(r) {
    const subjects = A.data.subjects;
    const n = r.questions;
    if (r.subject_quota && typeof r.subject_quota === 'object') {
      let ids = [];
      subjects.forEach((s) => {
        const k = parseInt(r.subject_quota[s.no], 10) || 0;
        ids = ids.concat(U.shuffle(s.ids).slice(0, k));
      });
      return U.shuffle(ids);
    }
    if (r.selection === 'equal_subjects') {
      const order = U.shuffle(subjects);
      const per = {};
      let left = n;
      // μοίρασμα κυκλικά, με όριο τις διαθέσιμες ερωτήσεις
      while (left > 0) {
        let progressed = false;
        for (const s of order) {
          if (left === 0) break;
          if ((per[s.no] || 0) < s.count) { per[s.no] = (per[s.no] || 0) + 1; left--; progressed = true; }
        }
        if (!progressed) break;
      }
      let ids = [];
      subjects.forEach((s) => { ids = ids.concat(U.shuffle(s.ids).slice(0, per[s.no] || 0)); });
      return U.shuffle(ids);
    }
    return U.shuffle(A.data.questions.map((q) => q.id)).slice(0, n);
  }

  /* ---------- Βαθμολόγηση ----------
     βαθμός = max(0, σωστές − ποινή × λάθος) / πλήθος × άριστα
     Οι αναπάντητες μετρούν 0. */
  function score(items, r) {
    let correct = 0, wrong = 0, blank = 0;
    items.forEach((it) => {
      if (!it.a) blank++;
      else if (it.ok) correct++;
      else wrong++;
    });
    const n = items.length || 1;
    const raw = Math.max(0, correct - r.penalty_fraction * wrong);
    const value = Math.round((raw / n) * r.max_score * 100) / 100;
    const passed = r.base_score === null ? null : value >= r.base_score;
    return { correct, wrong, blank, value, passed };
  }

  /* ---------- Ιστορικό ---------- */
  function history() {
    const h = A.store.getClean(K_HIST, []);
    return Array.isArray(h) ? h : [];
  }
  function addHistory(res) {
    const h = history();
    h.unshift(res);
    A.store.set(K_HIST, h.slice(0, HISTORY_MAX));
  }

  /* ---------- Εξέταση σε εξέλιξη ---------- */
  function session() { return A.store.get(K_SESS, null); }
  function saveSession(s) { A.store.set(K_SESS, s); }
  function clearSession() { A.store.remove(K_SESS); }

  /* ---------- Συγχώνευση κατά την εισαγωγή προόδου ---------- */
  A.backup.registerMerger(K_PROG, (local, incoming) => {
    const out = { schema: 1, q: Object.assign({}, (local && local.q) || {}) };
    const inc = (incoming && incoming.q) || {};
    Object.keys(inc).forEach((id) => {
      const a = out.q[id];
      const b = inc[id];
      if (!a || (b && b.t > a.t)) out.q[id] = b;
    });
    return out;
  });
  A.backup.registerMerger(K_HIST, (local, incoming) => {
    const map = {};
    (Array.isArray(local) ? local : []).concat(Array.isArray(incoming) ? incoming : []).forEach((r) => {
      if (r && r.id && !map[r.id]) map[r.id] = r;
    });
    return Object.values(map).sort((x, y) => y.date - x.date).slice(0, HISTORY_MAX);
  });

  /* ---------- Έλεγχος δεδομένων κατά την εισαγωγή προόδου ----------
     Κάθε τιμή ξαναχτίζεται μόνο από αναμενόμενα πεδία. Ό,τι δεν ταιριάζει πετιέται. */
  const C = A.backup.clean;
  const QID = /^\d{1,3}-\d{1,4}$/;
  const LET = ['α', 'β', 'γ', 'δ'];
  function cleanRules(v, partial) {
    if (!v || typeof v !== 'object') return partial ? {} : null;
    const out = {};
    const set = (k, val) => { if (val !== null) out[k] = val; };
    set('questions', C.int(v.questions, 1, 5000));
    set('time_minutes', C.num(v.time_minutes, 1, 600));
    set('allow_back', C.bool(v.allow_back));
    set('penalty_fraction', C.num(v.penalty_fraction, 0, 1));
    if (v.base_score === null) out.base_score = null; else set('base_score', C.num(v.base_score, 0, 1000));
    set('max_score', C.num(v.max_score, 1, 1000));
    set('weight_percent', C.num(v.weight_percent, 0, 100));
    set('selection', C.oneOf(v.selection, ['random_all', 'equal_subjects']));
    set('shuffle_options', C.bool(v.shuffle_options));
    if (v.subject_quota === null) out.subject_quota = null;
    else if (v.subject_quota && typeof v.subject_quota === 'object') {
      const qq = {};
      Object.keys(v.subject_quota).slice(0, 50).forEach((k) => {
        const val = C.int(v.subject_quota[k], 0, 5000);
        if (/^\d{1,3}$/.test(k) && val !== null) qq[k] = val;
      });
      out.subject_quota = qq;
    }
    if (partial) { delete out.subject_quota; }
    if (partial) { delete out.max_score; delete out.weight_percent; return out; }
    if (!('questions' in out) || !('max_score' in out)) return null;
    return out;
  }
  A.backup.registerSanitizer(K_PROG, (v) => {
    if (!v || typeof v.q !== 'object' || !v.q) return null;
    const q = {};
    Object.keys(v.q).slice(0, 20000).forEach((id) => {
      const e = v.q[id];
      if (!QID.test(id) || !e || typeof e !== 'object') return;
      const a = C.int(e.a, 0, 1e6), c = C.int(e.c, 0, 1e6), l = C.oneOf(e.l, [0, 1]);
      const t = C.num(e.t, 0, 1e14), h = C.str(e.h, /^[0-9a-z]{1,14}$/, 14);
      if (a === null || c === null || c > a || l === null || t === null || h === null) return;
      q[id] = { a, c, l, t, h };
    });
    return { schema: 1, q };
  });
  A.backup.registerSanitizer(K_HIST, (v) => {
    if (!Array.isArray(v)) return null;
    const out = [];
    v.slice(0, HISTORY_MAX).forEach((r) => {
      if (!r || typeof r !== 'object' || !Array.isArray(r.items)) return;
      const rules = cleanRules(r.rules, false);
      const id = C.str(r.id, /^[a-z0-9]{1,20}$/i, 20);
      const date = C.num(r.date, 0, 1e14);
      if (!rules || !id || date === null) return;
      const items = [];
      r.items.slice(0, 5000).forEach((it) => {
        if (!it || !QID.test(String(it.id))) return;
        const a = it.a === null ? null : C.oneOf(it.a, LET);
        if (it.a !== null && a === null) return;
        items.push({ id: String(it.id), a, ok: it.ok === true });
      });
      const n = (k) => C.int(r[k], 0, 5000);
      const rec = {
        id, date, rules, items,
        duration_sec: C.num(r.duration_sec, 0, 1e6) || 0,
        config_version: C.str(r.config_version, null, 60) || '',
        bank_version: C.str(r.bank_version, null, 60) || '',
        custom: r.custom === true,
        correct: n('correct'), wrong: n('wrong'), blank: n('blank'),
        score: C.num(r.score, -1e6, 1e6),
        passed: r.passed === true ? true : (r.passed === false ? false : null)
      };
      if (rec.correct === null || rec.wrong === null || rec.blank === null || rec.score === null) return;
      out.push(rec);
    });
    return out;
  });
  A.backup.registerSanitizer(K_SET, (v) => {
    if (!v || typeof v !== 'object') return null;
    const out = { practiceShuffle: v.practiceShuffle === true, exam: null };
    if (v.exam && typeof v.exam === 'object' && v.exam.values) {
      const values = cleanRules(v.exam.values, true);
      const bv = C.str(v.exam.base_version, null, 60);
      if (Object.keys(values).length && bv) out.exam = { base_version: bv, values };
    }
    return out;
  });

  A.knowledge = {
    entry, record, subjectStats, totals, wrongIds, unseenIds, mostMissed, staleCount, reload,
    settings, saveSettings, rules, defaultRules, hasCustomRules, customRulesOutdated, setCustomRules,
    pickExamIds, optionOrder, score, history, addHistory, session, saveSession, clearSession,
    clearProgress() { A.store.remove(K_PROG); A.store.remove(K_HIST); A.store.remove(K_SESS); reload(); }
  };
})();
