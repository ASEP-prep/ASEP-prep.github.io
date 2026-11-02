/* Εξέταση Γνώσεων – αρχική οθόνη της ενότητας. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const K = () => A.knowledge;

  function subjectRow(s) {
    const st = K().subjectStats(s);
    const okW = U.pct(st.seen - st.wrongNow, s.count);
    const badW = U.pct(st.wrongNow, s.count);
    const acc = st.attempts ? U.pct(st.correct, st.attempts) + '% σωστές' : 'χωρίς απαντήσεις';
    return '<li><button type="button" class="subject" data-subject="' + U.n(s.no) + '">' +
      '<span class="subject-head"><span class="subject-no">' + U.n(s.no) + '</span>' +
      '<span class="subject-name">' + esc(s.name) + '</span>' +
      '<span class="subject-meta">' + U.n(st.seen) + '/' + U.n(s.count) + '</span></span>' +
      '<span class="bar" aria-hidden="true"><i class="b-ok" style="width:' + okW + '%"></i><i class="b-bad" style="width:' + badW + '%"></i></span>' +
      '<span class="subject-meta" style="display:block;margin:0.25rem 0 0 2.2rem">' + acc +
      (st.wrongNow ? ' / ' + U.n(st.wrongNow) + ' για επανάληψη' : '') + '</span>' +
      '</button></li>';
  }

  function render(root) {
    const t = K().totals();
    const sess = K().session();
    const r = K().rules();
    const wrong = t.wrongNow;
    let html = '<h1>Εξέταση Γνώσεων</h1>' +
      '<p class="lead">' + U.fmtNum(A.data.questions.length) + ' ερωτήσεις σε ' + A.data.subjects.length +
      ' ενότητες, με τις επίσημες απαντήσεις του ΑΣΕΠ.</p>';

    if (sess && !sess.finished) {
      const left = Math.max(0, (sess.endAt - Date.now()) / 1000);
      html += '<div class="notice info"><p><strong>Έχεις προσομοίωση σε εξέλιξη.</strong> ' +
        (left > 0 ? 'Απομένουν ' + U.fmtClock(left) + '. Ο χρόνος τρέχει και όταν δεν είσαι στην οθόνη.' : 'Ο χρόνος έληξε.') +
        '</p><p><a class="btn small" href="#exam">' + (left > 0 ? 'Συνέχεια προσομοίωσης' : 'Δες το αποτέλεσμα') + '</a></p></div>';
    }

    html += '<div class="actions">' +
      '<button type="button" class="btn" data-go="practice-setup">Εξάσκηση</button>' +
      '<a class="btn" href="#exam-setup">Προσομοίωση</a>' +
      '<button type="button" class="btn ghost" data-go="wrong"' + (wrong ? '' : ' disabled') + '>Μόνο λάθη (' + wrong + ')</button>' +
      '<a class="btn ghost" href="#progress">Πρόοδος</a>' +
      '</div>';

    html += '<p class="small muted">Προσομοίωση: ' + U.n(r.questions) + ' ερωτήσεις σε ' + U.n(r.time_minutes) +
      ' λεπτά. Οι κανόνες είναι προσωρινοί μέχρι την προκήρυξη.</p>';

    html += '<h2>Ενότητες</h2>' +
      '<p class="small muted">Έχεις δει ' + U.fmtNum(t.seen) + ' από ' + U.fmtNum(t.total) + ' ερωτήσεις. ' +
      'Πράσινο: τελευταία απάντηση σωστή. Κόκκινο: τελευταία απάντηση λάθος.</p>' +
      '<ul class="subjects">' + A.data.subjects.map(subjectRow).join('') + '</ul>';

    root.innerHTML = html;

    root.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => {
      A.nav.practicePreset = { subjects: [Number(b.dataset.subject)] };
      location.hash = 'practice-setup';
    }));
    root.querySelector('[data-go="practice-setup"]').addEventListener('click', () => {
      A.nav.practicePreset = null;
      location.hash = 'practice-setup';
    });
    const w = root.querySelector('[data-go="wrong"]');
    if (w) w.addEventListener('click', () => {
      A.nav.practicePreset = { mode: 'wrong' };
      location.hash = 'practice-setup';
    });
  }

  A.registry.register({
    id: 'knowledge',
    routes: {
      knowledge: { title: 'Εξέταση Γνώσεων', parent: 'home', render }
    }
  });
})();
