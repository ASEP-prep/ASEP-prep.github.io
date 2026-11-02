/* Πρόοδος: ανά ενότητα, πιο αδύναμες ενότητες, ερωτήσεις με τα περισσότερα λάθη, ιστορικό. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const K = () => A.knowledge;
  const MIN_ATTEMPTS_FOR_WEAK = 10;

  function render(root) {
    const t = K().totals();
    const stats = A.data.subjects.map((s) => ({ s, st: K().subjectStats(s) }));
    const hist = K().history();
    const missed = K().mostMissed(10);
    const stale = K().staleCount();

    let html = '<h1>Πρόοδος</h1>';
    if (!t.attempts && !hist.length) {
      html += '<p class="empty">Δεν έχεις απαντήσει ακόμη σε ερωτήσεις. Ξεκίνα με μια <a href="#practice-setup">εξάσκηση</a> ή μια <a href="#exam-setup">προσομοίωση</a>.</p>';
      root.innerHTML = html;
      return;
    }
    html += '<div class="tally">' +
      '<span><b>' + U.fmtNum(t.seen) + ' / ' + U.fmtNum(t.total) + '</b>ερωτήσεις που έχεις δει</span>' +
      '<span><b>' + U.pct(t.correct, t.attempts) + '%</b>σωστές απαντήσεις</span>' +
      '<span><b>' + U.fmtNum(t.wrongNow) + '</b>για επανάληψη</span>' +
      '</div>';
    if (stale) {
      html += '<div class="notice info"><p>' + stale + ' εγγραφές προόδου αφορούν ερωτήσεις που άλλαξαν ή δεν υπάρχουν πια στην τρέχουσα τράπεζα. Δεν μετρούν στα στατιστικά.</p></div>';
    }

    html += '<h2>Ανά ενότητα</h2><div class="table-wrap"><table><thead><tr>' +
      '<th>Ενότητα</th><th class="num">Είδες</th><th class="num">Σωστές</th><th class="num">Λάθη</th></tr></thead><tbody>' +
      stats.map(({ s, st }) => '<tr><td>' + U.n(s.no) + '. ' + esc(s.name) + '</td>' +
        '<td class="num">' + U.n(st.seen) + '/' + U.n(s.count) + '</td>' +
        '<td class="num">' + (st.attempts ? U.pct(st.correct, st.attempts) + '%' : '—') + '</td>' +
        '<td class="num">' + U.n(st.wrongNow) + '</td></tr>').join('') +
      '</tbody></table></div>' +
      '<p class="small muted">Σωστές: ποσοστό σε όλες τις προσπάθειες. Λάθη: ερωτήσεις με λάθος τελευταία απάντηση, για επανάληψη.</p>';

    const weak = stats.filter((x) => x.st.attempts >= MIN_ATTEMPTS_FOR_WEAK)
      .sort((a, b) => a.st.correct / a.st.attempts - b.st.correct / b.st.attempts).slice(0, 3);
    html += '<h2>Πιο αδύναμες ενότητες</h2>';
    if (weak.length) {
      html += '<ul class="subjects">' + weak.map(({ s, st }) =>
        '<li><button type="button" class="subject" data-subject="' + U.n(s.no) + '"><span class="subject-head">' +
        '<span class="subject-no">' + U.n(s.no) + '</span><span class="subject-name">' + esc(s.name) + '</span>' +
        '<span class="subject-meta">' + U.pct(st.correct, st.attempts) + '%</span></span></button></li>').join('') + '</ul>';
    } else {
      html += '<p class="muted small">Χρειάζονται τουλάχιστον ' + MIN_ATTEMPTS_FOR_WEAK + ' απαντήσεις σε μια ενότητα για να συγκριθεί.</p>';
    }

    html += '<h2>Ερωτήσεις με τα περισσότερα λάθη</h2>';
    if (missed.length) {
      html += '<ul class="review">' + missed.map((m) => {
        const q = A.data.byId[m.id];
        return '<li>' + A.qview.stamp(q) + '<p class="qtext" style="font-size:1rem">' + esc(q.question) + '</p>' +
          '<p class="small muted">' + U.n(m.miss) + ' λάθος σε ' + U.n(m.a) + ' προσπάθειες' + (m.l ? ', την τελευταία φορά σωστά' : '') + '</p></li>';
      }).join('') + '</ul>' +
      '<button type="button" class="btn" id="drill">Εξάσκηση σε αυτές</button>';
    } else {
      html += '<p class="muted small">Δεν υπάρχουν λάθη ακόμη.</p>';
    }

    html += '<h2>Ιστορικό προσομοιώσεων</h2>';
    if (hist.length) {
      html += '<ul class="history">' + hist.map((h) =>
        '<li><button type="button" data-res="' + esc(h.id) + '"><span class="h-score">' + U.fmtNum(h.score, 2) + '/' + U.n(h.rules.max_score) + '</span>' +
        '<span class="h-meta">' + esc(U.fmtDate(h.date)) + '<br>' + U.n(h.correct) + ' σωστές, ' + U.n(h.wrong) + ' λάθος, ' + U.n(h.blank) + ' αναπάντητες' +
        (h.custom ? ', δικοί σου κανόνες' : '') + '</span></button></li>').join('') + '</ul>';
    } else {
      html += '<p class="muted small">Δεν έχεις κάνει ακόμη προσομοίωση.</p>';
    }
    html += '<p class="small muted" style="margin-top:1.5rem">Αντίγραφο ασφαλείας, μεταφορά σε άλλη συσκευή και διαγραφή της προόδου: <a href="#prefs">Ρυθμίσεις</a>.</p>';
    root.innerHTML = html;

    root.querySelectorAll('[data-subject]').forEach((b) => b.addEventListener('click', () => {
      A.nav.practicePreset = { subjects: [Number(b.dataset.subject)] };
      location.hash = 'practice-setup';
    }));
    root.querySelectorAll('[data-res]').forEach((b) => b.addEventListener('click', () => {
      A.nav.resultId = b.dataset.res;
      location.hash = 'result';
    }));
    const d = root.querySelector('#drill');
    if (d) d.addEventListener('click', () => {
      A.nav.practicePreset = { ids: missed.map((m) => m.id), label: 'Περισσότερα λάθη' };
      location.hash = 'practice-setup';
    });
  }

  A.registry.register({
    id: 'knowledge-progress',
    routes: { progress: { title: 'Πρόοδος', parent: 'knowledge', render } }
  });
})();
