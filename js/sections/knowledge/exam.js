/* Προσομοίωση Εξέτασης Γνώσεων.
   Κανόνες από data/exam-config.json (+ αλλαγές του χρήστη στις Ρυθμίσεις).
   Η εξέταση σε εξέλιξη αποθηκεύεται, και ο χρόνος μετριέται από την ώρα λήξης,
   οπότε ανανέωση της σελίδας ή έξοδος δεν σταματούν το χρονόμετρο. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const K = () => A.knowledge;
  const L = A.data.LETTERS;

  let timer = null;
  let keyHandler = null;

  function selectionLabel(r) {
    if (r.subject_quota) return 'Συγκεκριμένος αριθμός ανά ενότητα (από το αρχείο κανόνων)';
    if (r.selection === 'equal_subjects') return 'Περίπου ισόποσα από κάθε ενότητα (δική σου ρύθμιση, όχι επίσημη)';
    return 'Τυχαία από όλη την τράπεζα';
  }
  function penaltyLabel(r) {
    return r.penalty_fraction ? '−' + U.fmtNum(r.penalty_fraction, 2) + ' της αξίας μιας σωστής ανά λάθος' : 'Όχι';
  }

  function rulesTable(r) {
    const rows = [
      ['Ερωτήσεις', r.questions],
      ['Χρόνος', r.time_minutes + ' λεπτά'],
      ['Επιστροφή σε προηγούμενη ερώτηση', r.allow_back ? 'Ναι' : 'Όχι'],
      ['Αρνητική βαθμολογία', penaltyLabel(r)],
      ['Βάση', r.base_score === null ? 'Χωρίς βάση' : U.fmtNum(r.base_score, 2)],
      ['Άριστα', r.max_score],
      ['Βαρύτητα στη συνολική βαθμολογία', (r.weight_percent != null ? r.weight_percent + '%' : '—') + ' (πληροφοριακά)'],
      ['Επιλογή ερωτήσεων', selectionLabel(r)],
      ['Ανακάτεμα επιλογών', r.shuffle_options ? 'Ναι' : 'Όχι']
    ];
    return '<div class="table-wrap"><table><tbody>' +
      rows.map((x) => '<tr><th scope="row">' + x[0] + '</th><td>' + esc(String(x[1])) + '</td></tr>').join('') +
      '</tbody></table></div>';
  }

  function provisionalNotice() {
    const c = A.data.config;
    if (c.status !== 'provisional') return '';
    return '<div class="notice"><p><strong>Προσωρινοί κανόνες.</strong> ' + esc(c.status_note || '') + '</p></div>';
  }

  /* ---------- Οθόνη κανόνων ---------- */
  function renderSetup(root) {
    const sess = K().session();
    if (sess && !sess.finished) { location.replace('#exam'); return; }
    const r = K().rules();
    let html = '<h1>Προσομοίωση εξέτασης</h1>' + provisionalNotice();
    if (K().hasCustomRules()) {
      html += '<div class="notice info"><p>Χρησιμοποιείς δικούς σου κανόνες. ' +
        (K().customRulesOutdated() ? '<strong>Οι προεπιλογές της εφαρμογής έχουν αλλάξει από τότε.</strong> ' : '') +
        '<a href="#prefs">Αλλαγή στις Ρυθμίσεις</a></p></div>';
    }
    html += '<h2>Κανόνες</h2>' + rulesTable(r) +
      '<p class="small muted">Η πραγματική κατανομή των ερωτήσεων ανά ενότητα δεν είναι γνωστή. ' +
      'Ο χρόνος συνεχίζει να τρέχει αν βγεις από την οθόνη.</p>' +
      '<button type="button" class="btn wide" id="start">Έναρξη προσομοίωσης</button>' +
      '<p class="small" style="margin-top:0.75rem"><a href="#prefs">Αλλαγή κανόνων</a></p>';
    root.innerHTML = html;
    root.querySelector('#start').addEventListener('click', () => {
      const ids = K().pickExamIds(r);
      const now = Date.now();
      K().saveSession({
        id: 'e' + now.toString(36),
        started: now,
        endAt: now + r.time_minutes * 60000,
        rules: r,
        config_version: A.data.config.version,
        custom: K().hasCustomRules(),
        bank_version: A.data.bank.meta.version,
        ids,
        orders: ids.map((id) => K().optionOrder(A.data.byId[id], r.shuffle_options)),
        answers: ids.map(() => null),
        index: 0,
        finished: false
      });
      location.hash = 'exam';
    });
  }

  /* ---------- Εξέταση ---------- */
  // Βαθμολόγηση και καταγραφή μιας εξέτασης (κοινό για υποβολή και λήξη χρόνου).
  function buildResult(s) {
    const r = s.rules;
    const items = s.ids.map((id, i) => {
      const q = A.data.byId[id];
      const a = s.answers[i];
      return { id, a: a || null, ok: !!(q && a && a === q.answer) };
    });
    // Πρόοδος: μετρούν μόνο οι απαντημένες ερωτήσεις.
    items.forEach((it) => { const q = A.data.byId[it.id]; if (q && it.a) K().record(q, it.ok); });
    const sc = K().score(items, r);
    const res = {
      id: s.id,
      date: s.started,
      duration_sec: Math.round((Math.min(Date.now(), s.endAt) - s.started) / 1000),
      rules: r,
      config_version: s.config_version,
      custom: s.custom,
      bank_version: s.bank_version,
      items,
      correct: sc.correct,
      wrong: sc.wrong,
      blank: sc.blank,
      score: sc.value,
      passed: sc.passed
    };
    K().addHistory(res);
    K().clearSession();
    return res;
  }

  function finish(s) {
    stop();
    // Μόνο μία βαθμολόγηση ανά εξέταση: αν έληξε ο χρόνος ενώ ήταν ανοιχτό το
    // παράθυρο «Υποβολή;», η εξέταση έχει ήδη βαθμολογηθεί.
    const cur = K().session();
    if (!cur || cur.finished || cur.id !== s.id) return;
    U.closeDialog();
    const res = buildResult(cur);
    A.nav.resultId = res.id;
    location.replace('#result');
  }

  function stop() {
    if (timer) clearInterval(timer);
    timer = null;
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = null;
  }

  function renderExam(root) {
    stop();
    const s = K().session();
    if (!s || s.finished) { location.replace('#exam-setup'); return; }
    if (Date.now() >= s.endAt) { finish(s); return; }

    const r = s.rules;
    const i = s.index;
    const q = A.data.byId[s.ids[i]];
    if (!q) {
      // η ερώτηση δεν υπάρχει πια (π.χ. άλλαξε η τράπεζα): μετρά ως αναπάντητη
      if (i < s.ids.length - 1) { s.index++; K().saveSession(s); return renderExam(root); }
      return finish(s);
    }
    const order = s.orders[i];
    const chosen = s.answers[i];
    const last = i === s.ids.length - 1;
    const answeredCount = s.answers.filter(Boolean).length;

    let html =
      '<div class="qhead"><span class="qcount">Ερώτηση ' + (i + 1) + ' / ' + s.ids.length + '</span>' +
      '<span>' + answeredCount + ' απαντημένες</span>' +
      '<span class="timer" id="timer" role="timer" aria-label="Χρόνος που απομένει"></span></div>' +
      '<div class="progress-line" aria-hidden="true"><i style="width:' + U.pct(i, s.ids.length) + '%"></i></div>';
    if (r.allow_back) {
      html += '<div class="navgrid" aria-label="Μετάβαση σε ερώτηση">' + s.ids.map((_, k) =>
        '<button type="button" data-k="' + k + '" class="' + (s.answers[k] ? 'done ' : '') + (k === i ? 'here' : '') + '"' +
        ' aria-label="Ερώτηση ' + (k + 1) + '">' + (k + 1) + '</button>').join('') + '</div>';
    }
    html += '<article class="sheet">' + A.qview.question(q, { order, selected: chosen, reveal: false }) + '</article>';
    if (!r.allow_back) html += '<p class="small muted" style="margin-top:0.6rem">Δεν μπορείς να γυρίσεις σε προηγούμενη ερώτηση.</p>';
    html += '<div class="bottombar">' +
      (r.allow_back && i > 0 ? '<button type="button" class="btn quiet" id="prev">Προηγούμενη</button>' :
        '<button type="button" class="btn quiet" id="submit-now">Υποβολή τώρα</button>') +
      '<button type="button" class="btn" id="next">' +
      (last ? 'Υποβολή' : (chosen ? 'Επόμενη' : 'Παράλειψη')) + '</button></div>';
    if (r.allow_back && i > 0) html += '<p class="small"><button type="button" class="btn small quiet" id="submit-now">Υποβολή τώρα</button></p>';
    root.innerHTML = html;

    const tEl = root.querySelector('#timer');
    function tick() {
      const left = (s.endAt - Date.now()) / 1000;
      tEl.textContent = U.fmtClock(left);
      tEl.classList.toggle('low', left <= 300 && left > 60);
      tEl.classList.toggle('critical', left <= 60);
      if (left <= 0) {
        finish(s);
      }
    }
    tick();
    timer = setInterval(tick, 500);

    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => choose(b.dataset.letter)));
    root.querySelector('#next').addEventListener('click', () => {
      if (last) {
        const blanks = s.answers.filter((a) => !a).length;
        const msg = blanks ? 'Υποβολή της εξέτασης; ' + blanks + ' ερωτήσεις είναι αναπάντητες.' : 'Υποβολή της εξέτασης;';
        if (!r.allow_back && !blanks) return finish(s);
        U.confirmDialog(msg, 'Υποβολή').then((ok) => { if (ok) finish(s); });
        return;
      }
      go(i + 1);
    });
    root.querySelectorAll('#submit-now').forEach((b) => b.addEventListener('click', () => {
      const blanks = s.answers.filter((a) => !a).length;
      U.confirmDialog('Υποβολή τώρα; Οι ' + blanks + ' αναπάντητες ερωτήσεις μετρούν 0.', 'Υποβολή').then((ok) => {
        if (ok) finish(s);
      });
    }));
    const prev = root.querySelector('#prev');
    if (prev) prev.addEventListener('click', () => go(i - 1));
    root.querySelectorAll('.navgrid [data-k]').forEach((b) => b.addEventListener('click', () => go(Number(b.dataset.k))));

    function choose(letter) {
      s.answers[i] = letter;
      K().saveSession(s);
      root.querySelectorAll('.opt').forEach((b) => {
        const on = b.dataset.letter === letter;
        b.classList.toggle('selected', on);
        b.setAttribute('aria-pressed', String(on));
      });
      if (!last) root.querySelector('#next').textContent = 'Επόμενη';
    }
    function go(k) {
      if (!r.allow_back && k < i) return;
      s.index = Math.max(0, Math.min(k, s.ids.length - 1));
      K().saveSession(s);
      renderExam(root);
      window.scrollTo(0, 0);
    }
    keyHandler = (e) => {
      if (document.getElementById('modal') && !document.getElementById('modal').hidden) return;
      const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'α': 0, 'β': 1, 'γ': 2, 'δ': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const k = e.key.toLowerCase();
      if (k in map) { e.preventDefault(); choose(order[map[k]]); }
    };
    document.addEventListener('keydown', keyHandler);
  }

  /* ---------- Αποτέλεσμα ---------- */
  function renderResult(root) {
    const hist = K().history();
    const res = hist.find((h) => h.id === A.nav.resultId) || hist[0];
    if (!res) { location.replace('#knowledge'); return; }
    const r = res.rules;
    const bySubj = {};
    res.items.forEach((it) => {
      const q = A.data.byId[it.id];
      const no = q ? q.subject_no : 0;
      const row = bySubj[no] || (bySubj[no] = { n: 0, c: 0, w: 0, b: 0 });
      row.n++;
      if (!it.a) row.b++; else if (it.ok) row.c++; else row.w++;
    });
    const subjRows = Object.keys(bySubj).map(Number).sort((a, b) => a - b).map((no) => {
      const s = A.data.subjectByNo(no);
      const x = bySubj[no];
      return '<tr><td>' + (s ? s.no + '. ' + esc(s.name) : 'Ερωτήσεις που δεν υπάρχουν πια στην τράπεζα') + '</td>' +
        '<td class="num">' + U.n(x.n) + '</td><td class="num">' + U.n(x.c) + '</td><td class="num">' + U.n(x.w) + '</td><td class="num">' + U.n(x.b) + '</td></tr>';
    }).join('');

    let html = '<h1>Αποτέλεσμα</h1>' +
      '<p class="muted small">' + esc(U.fmtDate(res.date)) + ', διάρκεια ' + U.fmtClock(res.duration_sec) + '</p>' +
      '<div class="score"><strong>' + U.fmtNum(res.score, 2) + '</strong><span>/ ' + U.n(r.max_score) + '</span></div>' +
      (res.passed === null ? '' : '<p class="verdict ' + (res.passed ? 'ok' : 'bad') + '">' +
        (res.passed ? 'Πάνω από τη βάση (' : 'Κάτω από τη βάση (') + U.fmtNum(r.base_score, 2) + ').</p>') +
      '<div class="tally"><span><b>' + U.n(res.correct) + '</b>σωστές</span><span><b>' + U.n(res.wrong) + '</b>λάθος</span><span><b>' + U.n(res.blank) + '</b>αναπάντητες</span></div>' +
      '<p class="small muted">Κανόνες: ' + U.n(r.questions) + ' ερωτήσεις, ' + U.n(r.time_minutes) + ' λεπτά, αρνητική βαθμολογία: ' +
      penaltyLabel(r).toLowerCase() + ', ' + (r.base_score === null ? 'χωρίς βάση' : 'βάση ' + U.n(r.base_score)) +
      (res.custom ? ', δικοί σου κανόνες' : ', προσωρινοί κανόνες της εφαρμογής') + '. Τράπεζα ' + esc(res.bank_version || '') + '.</p>' +
      '<div class="actions">' +
      '<a class="btn" href="#exam-setup">Νέα προσομοίωση</a>' +
      '<button type="button" class="btn ghost" id="drill"' + (res.wrong + res.blank ? '' : ' disabled') + '>Εξάσκηση σε λάθη και αναπάντητες</button>' +
      '</div>' +
      '<h2>Ανά ενότητα</h2><div class="table-wrap"><table><thead><tr><th>Ενότητα</th><th class="num">Ερ.</th><th class="num">Σωστές</th><th class="num">Λάθος</th><th class="num">Αναπ.</th></tr></thead><tbody>' +
      subjRows + '</tbody></table></div>' +
      '<h2>Ανασκόπηση</h2>' +
      '<div class="chips" role="radiogroup" aria-label="Εμφάνιση">' +
      '<label class="chip"><input type="radio" name="rv" value="bad" checked><span>Λάθη και αναπάντητες</span></label>' +
      '<label class="chip"><input type="radio" name="rv" value="all"><span>Όλες</span></label></div>' +
      '<ul class="review" id="review"></ul>' +
      '<p><a href="#progress">Ιστορικό προσομοιώσεων</a></p>';
    root.innerHTML = html;

    const list = root.querySelector('#review');
    function fill(which) {
      const rows = res.items.map((it, idx) => ({ it, idx })).filter((x) => which === 'all' || !x.it.ok);
      list.innerHTML = rows.length ? rows.map((x) => {
        const q = A.data.byId[x.it.id];
        return q ? A.qview.reviewItem(q, x.it.a, x.idx) :
          '<li><p class="muted">Η ερώτηση ' + esc(x.it.id) + ' δεν υπάρχει στην τρέχουσα τράπεζα.</p></li>';
      }).join('') : '<li class="empty">Όλες οι απαντήσεις ήταν σωστές.</li>';
    }
    root.querySelectorAll('[name="rv"]').forEach((x) => x.addEventListener('change', () => fill(x.value)));
    fill('bad');
    root.querySelector('#drill').addEventListener('click', () => {
      const ids = res.items.filter((it) => !it.ok && A.data.byId[it.id]).map((it) => it.id);
      A.nav.practicePreset = { ids, label: 'Λάθη προσομοίωσης' };
      location.hash = 'practice-setup';
    });
  }

  A.registry.register({
    id: 'knowledge-exam',
    routes: {
      'exam-setup': { title: 'Προσομοίωση', parent: 'knowledge', render: renderSetup },
      exam: { title: 'Προσομοίωση σε εξέλιξη', parent: 'knowledge', render: renderExam, leave: stop },
      result: { title: 'Αποτέλεσμα', parent: 'knowledge', render: renderResult }
    }
  });

  // Αν ο χρόνος έληξε όσο η εφαρμογή ήταν κλειστή, βαθμολόγησε στην εκκίνηση.
  A.knowledgeExam = {
    finishIfExpired() {
      const s = K().session();
      if (s && !s.finished && Date.now() >= s.endAt) {
        stop();
        A.nav.resultId = buildResult(s).id;
        return true;
      }
      return false;
    }
  };
})();
