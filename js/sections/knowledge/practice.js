/* Εξάσκηση: ανά ενότητα, τυχαία, με τη σειρά, μόνο λάθη, αδιάβαστες.
   Η απάντηση και η επεξήγηση φαίνονται αμέσως. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const K = () => A.knowledge;
  const L = A.data.LETTERS;

  const MODES = [
    { id: 'random', label: 'Τυχαία' },
    { id: 'order', label: 'Με τη σειρά' },
    { id: 'wrong', label: 'Μόνο λάθη' },
    { id: 'unseen', label: 'Αδιάβαστες' }
  ];
  const COUNTS = [10, 20, 50, 0]; // 0 = όλες

  let keyHandler = null;

  /* ---------- Ρύθμιση γύρου ---------- */
  function renderSetup(root) {
    const preset = A.nav.practicePreset || {};
    if (preset.ids && preset.ids.length) {
      startSession(preset.ids.slice(), preset.label || 'Επιλεγμένες ερωτήσεις', 'list');
      A.nav.practicePreset = null;
      location.hash = 'practice';
      return;
    }
    const st = K().settings();
    const pickedSubjects = new Set(preset.subjects || []);
    const mode = preset.mode || 'random';

    let html = '<h1>Εξάσκηση</h1>' +
      '<p class="lead">Βλέπεις την επίσημη απάντηση αμέσως μετά από κάθε ερώτηση.</p>' +
      '<form id="ps" novalidate>' +
      '<fieldset><legend>Ενότητες</legend><div class="chips">' +
      '<label class="chip"><input type="checkbox" name="all" ' + (pickedSubjects.size ? '' : 'checked') + '><span>Όλες</span></label>' +
      A.data.subjects.map((s) =>
        '<label class="chip"><input type="checkbox" name="subj" value="' + U.n(s.no) + '" ' + (pickedSubjects.has(s.no) ? 'checked' : '') + '>' +
        '<span>' + U.n(s.no) + '. ' + esc(s.name) + '</span></label>').join('') +
      '</div></fieldset>' +
      '<fieldset><legend>Ποιες ερωτήσεις</legend><div class="chips">' +
      MODES.map((m) => '<label class="chip"><input type="radio" name="mode" value="' + m.id + '" ' + (m.id === mode ? 'checked' : '') + '><span>' + m.label + '</span></label>').join('') +
      '</div></fieldset>' +
      '<div class="field" id="start-field" hidden><label for="start-no">Ξεκίνα από την ερώτηση</label>' +
      '<input type="number" id="start-no" min="1" value="1" inputmode="numeric"><span class="hint">Για «Με τη σειρά» σε μία ενότητα.</span></div>' +
      '<fieldset><legend>Πλήθος</legend><div class="chips">' +
      COUNTS.map((c, i) => '<label class="chip"><input type="radio" name="count" value="' + c + '" ' + (i === 1 ? 'checked' : '') + '><span>' + (c || 'Όλες') + '</span></label>').join('') +
      '</div></fieldset>' +
      '<label class="switch"><input type="checkbox" id="shuffle" ' + (st.practiceShuffle ? 'checked' : '') + '>' +
      '<span>Ανακάτεμα επιλογών<br><span class="small muted">Οι επιλογές εμφανίζονται με τυχαία σειρά, ώστε να μη θυμάσαι τη θέση της σωστής.</span></span></label>' +
      '<p class="small muted" id="avail" aria-live="polite"></p>' +
      '<button type="submit" class="btn wide" id="go">Ξεκίνα</button>' +
      '</form>';
    root.innerHTML = html;

    const form = root.querySelector('#ps');
    const allBox = form.querySelector('[name="all"]');
    const subjBoxes = Array.from(form.querySelectorAll('[name="subj"]'));

    function chosenSubjects() {
      const sel = subjBoxes.filter((b) => b.checked).map((b) => Number(b.value));
      return sel.length ? sel : A.data.subjects.map((s) => s.no);
    }
    function pool() {
      const m = form.querySelector('[name="mode"]:checked').value;
      let ids = [];
      chosenSubjects().forEach((no) => { ids = ids.concat(A.data.subjectByNo(no).ids); });
      if (m === 'wrong') ids = K().wrongIds(ids);
      if (m === 'unseen') ids = K().unseenIds(ids);
      return { m, ids };
    }
    function update() {
      const p = pool();
      const single = subjBoxes.filter((b) => b.checked).length === 1;
      root.querySelector('#start-field').hidden = !(p.m === 'order' && single);
      const n = p.ids.length;
      const av = root.querySelector('#avail');
      av.textContent = n ? 'Διαθέσιμες ερωτήσεις: ' + U.fmtNum(n) + '.' :
        (p.m === 'wrong' ? 'Δεν υπάρχουν λάθη για επανάληψη σε αυτές τις ενότητες.' :
          p.m === 'unseen' ? 'Έχεις δει όλες τις ερωτήσεις αυτών των ενοτήτων.' : 'Δεν υπάρχουν ερωτήσεις.');
      root.querySelector('#go').disabled = !n;
    }
    allBox.addEventListener('change', () => {
      if (allBox.checked) subjBoxes.forEach((b) => { b.checked = false; });
      else if (!subjBoxes.some((b) => b.checked)) allBox.checked = true;
      update();
    });
    subjBoxes.forEach((b) => b.addEventListener('change', () => {
      allBox.checked = !subjBoxes.some((x) => x.checked);
      update();
    }));
    form.querySelectorAll('[name="mode"]').forEach((r) => r.addEventListener('change', update));
    form.querySelector('#shuffle').addEventListener('change', (e) => {
      const s = K().settings();
      s.practiceShuffle = e.target.checked;
      K().saveSettings(s);
    });
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const p = pool();
      if (!p.ids.length) return;
      const count = Number(form.querySelector('[name="count"]:checked').value);
      let ids = p.ids;
      if (p.m === 'order') {
        const single = subjBoxes.filter((b) => b.checked).length === 1;
        if (single) {
          const from = Math.max(1, parseInt(root.querySelector('#start-no').value, 10) || 1);
          ids = ids.filter((id) => A.data.byId[id].number >= from);
          if (!ids.length) { U.toast('Δεν υπάρχει ερώτηση με αυτόν τον αριθμό.'); return; }
        }
      } else {
        ids = U.shuffle(ids);
      }
      if (count) ids = ids.slice(0, count);
      const label = MODES.find((x) => x.id === p.m).label;
      startSession(ids, label, p.m);
      A.nav.practicePreset = null;
      location.hash = 'practice';
    });
    update();
  }

  function startSession(ids, label, mode) {
    const shuffle = K().settings().practiceShuffle;
    A.nav.practice = {
      ids,
      label,
      mode,
      i: 0,
      orders: ids.map((id) => K().optionOrder(A.data.byId[id], shuffle)),
      answers: {},
      done: false
    };
  }

  /* ---------- Οθόνη ερώτησης ---------- */
  function renderPractice(root) {
    const s = A.nav.practice;
    if (!s) { location.replace('#knowledge'); return; }
    if (s.done) return renderSummary(root, s);

    const id = s.ids[s.i];
    const q = A.data.byId[id];
    if (!q) { s.i++; if (s.i >= s.ids.length) s.done = true; return renderPractice(root); }
    const order = s.orders[s.i];
    const chosen = s.answers[id] || null;
    const last = s.i === s.ids.length - 1;

    root.innerHTML =
      '<div class="qhead"><span class="qcount">Ερώτηση ' + (s.i + 1) + ' / ' + s.ids.length + '</span>' +
      '<span>' + esc(s.label) + '</span></div>' +
      '<div class="progress-line" aria-hidden="true"><i style="width:' + U.pct(s.i, s.ids.length) + '%"></i></div>' +
      '<article class="sheet">' + A.qview.question(q, { order, selected: chosen, reveal: !!chosen }) +
      (chosen ? A.qview.feedback(q, chosen, order) : '') + '</article>' +
      '<div class="bottombar">' +
      '<button type="button" class="btn quiet" id="end">Τέλος</button>' +
      '<button type="button" class="btn" id="next">' + (chosen ? (last ? 'Σύνοψη' : 'Επόμενη') : 'Παράλειψη') + '</button>' +
      '</div>';

    root.querySelectorAll('.opt').forEach((b) => b.addEventListener('click', () => answer(b.dataset.letter)));
    root.querySelector('#next').addEventListener('click', next);
    root.querySelector('#end').addEventListener('click', () => { s.done = true; renderPractice(root); window.scrollTo(0, 0); });

    function answer(letter) {
      if (s.answers[id]) return;
      s.answers[id] = letter;
      K().record(q, letter === q.answer);
      renderPractice(root);
      const fb = root.querySelector('.feedback');
      if (fb && fb.scrollIntoView) fb.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
    function next() {
      if (last) s.done = true; else s.i++;
      renderPractice(root);
      window.scrollTo(0, 0);
    }
    setKeys((e) => {
      if (e.target && /input|textarea|select/i.test(e.target.tagName)) return;
      const map = { '1': 0, '2': 1, '3': 2, '4': 3, 'α': 0, 'β': 1, 'γ': 2, 'δ': 3, 'a': 0, 'b': 1, 'c': 2, 'd': 3 };
      const k = e.key.toLowerCase();
      if (!chosen && k in map) { e.preventDefault(); answer(order[map[k]]); }
      else if (e.key === 'Enter' && chosen) { e.preventDefault(); next(); }
    });
  }

  function renderSummary(root, s) {
    setKeys(null);
    const answered = s.ids.filter((id) => s.answers[id]);
    const correct = answered.filter((id) => s.answers[id] === A.data.byId[id].answer);
    const wrong = answered.filter((id) => s.answers[id] !== A.data.byId[id].answer);
    let html = '<h1>Τέλος γύρου</h1>' +
      '<div class="tally">' +
      '<span><b>' + correct.length + '</b>σωστές</span>' +
      '<span><b>' + wrong.length + '</b>λάθος</span>' +
      '<span><b>' + (s.ids.length - answered.length) + '</b>δεν απαντήθηκαν</span>' +
      '</div>' +
      '<div class="actions">' +
      '<button type="button" class="btn" id="again-wrong"' + (wrong.length ? '' : ' disabled') + '>Ξανά τα λάθη του γύρου</button>' +
      '<a class="btn ghost" href="#practice-setup">Νέα εξάσκηση</a>' +
      '</div>';
    if (wrong.length) {
      html += '<h2>Τα λάθη σου</h2><ul class="review">' +
        wrong.map((id, i) => A.qview.reviewItem(A.data.byId[id], s.answers[id], i)).join('') + '</ul>';
    } else if (answered.length) {
      html += '<p class="empty">Καμία λάθος απάντηση σε αυτόν τον γύρο.</p>';
    }
    html += '<p><a href="#knowledge">Πίσω στην Εξέταση Γνώσεων</a></p>';
    root.innerHTML = html;
    const b = root.querySelector('#again-wrong');
    if (b) b.addEventListener('click', () => {
      startSession(U.shuffle(wrong), 'Λάθη του γύρου', 'list');
      renderPractice(root);
      window.scrollTo(0, 0);
    });
  }

  function setKeys(fn) {
    if (keyHandler) document.removeEventListener('keydown', keyHandler);
    keyHandler = fn;
    if (fn) document.addEventListener('keydown', fn);
  }

  A.registry.register({
    id: 'knowledge-practice',
    routes: {
      'practice-setup': { title: 'Εξάσκηση', parent: 'knowledge', render: renderSetup },
      practice: { title: 'Εξάσκηση', parent: 'knowledge', render: renderPractice, leave: () => setKeys(null) }
    }
  });
})();
