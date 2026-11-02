/* Κοινή εμφάνιση ερώτησης για εξάσκηση, εξέταση και ανασκόπηση. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const L = A.data.LETTERS;

  function stamp(q) {
    return '<span class="stamp" title="Πηγή: επίσημο Μητρώο Θεμάτων Γνώσεων ΑΣΕΠ"><b>[ΑΣΕΠ]</b> ' +
      esc(A.data.sourceLabel(q)) + '</span>';
  }

  /* opts: { order: ['γ','α',...], selected: 'β'|null, reveal: bool }
     Τα κουμπιά έχουν data-letter = αρχικό γράμμα του ΑΣΕΠ.
     Το γράμμα που φαίνεται είναι η θέση στην οθόνη (α–δ). */
  function question(q, opts) {
    const order = opts.order || L;
    const reveal = !!opts.reveal;
    let html = stamp(q) +
      '<p class="muted small">' + esc(q.subject) + '</p>' +
      '<p class="qtext" id="qtext">' + esc(q.question) + '</p>' +
      '<ul class="options" role="list" aria-labelledby="qtext">';
    order.forEach((orig, pos) => {
      const cls = ['opt'];
      let mark = '';
      if (reveal) {
        if (orig === q.answer) { cls.push('correct'); mark = 'Επίσημη απάντηση ΑΣΕΠ'; }
        else if (orig === opts.selected) { cls.push('wrong'); mark = 'Η επιλογή σου'; }
      } else if (orig === opts.selected) {
        cls.push('selected');
      }
      html += '<li><button type="button" class="' + cls.join(' ') + '" data-letter="' + orig + '"' +
        (reveal ? ' disabled' : '') + ' aria-pressed="' + (orig === opts.selected) + '">' +
        '<span class="letter" aria-hidden="true">' + L[pos] + '</span>' +
        '<span><span class="sr">' + L[pos] + '. </span>' + esc(q.options[orig]) + '</span>' +
        (mark ? '<span class="mark">' + mark + '</span>' : '') +
        '</button></li>';
    });
    html += '</ul>';
    return html;
  }

  function displayLetter(order, orig) {
    const i = (order || L).indexOf(orig);
    return i >= 0 ? L[i] : orig;
  }

  function explanation(q) {
    const ex = A.data.explanations[q.id];
    if (!ex) {
      return '<p class="qnote">Δεν υπάρχει ακόμη επεξήγηση για αυτή την ερώτηση. Εμφανίζεται μόνο η επίσημη απάντηση.</p>';
    }
    const uncertain = ex.tag === 'ΑΒΕΒΑΙΟ';
    return '<div class="explain">' +
      '<p><span class="tag' + (uncertain ? ' uncertain' : '') + '">[' + ex.tag + ']</span> ' +
      (uncertain
        ? 'Η επίσημη απάντηση ίσως δεν ισχύει πια ή είναι αμφίβολη. Έλεγξέ τη στην ισχύουσα νομοθεσία.'
        : 'Επεξήγηση που δεν είναι επίσημο υλικό του ΑΣΕΠ.') + '</p>' +
      '<p>' + esc(ex.text) + '</p>' +
      (ex.basis ? '<p class="muted">Βάση: ' + esc(ex.basis) + '</p>' : '') +
      '</div>';
  }

  function notes(q) {
    if (!Array.isArray(q.notes) || !q.notes.length) return '';
    return q.notes.map((n) => '<p class="qnote">Σημείωση εξαγωγής: ' + esc(n) + '</p>').join('');
  }

  // Ανατροφοδότηση μετά την απάντηση (εξάσκηση).
  function feedback(q, selected, order) {
    const ok = selected === q.answer;
    const shuffled = order && order.join('') !== L.join('');
    return '<div class="feedback" aria-live="polite">' +
      '<p class="verdict ' + (ok ? 'ok' : 'bad') + '">' + (ok ? 'Σωστά.' : 'Λάθος.') + '</p>' +
      '<p class="small">Επίσημη απάντηση ΑΣΕΠ: <strong>' + displayLetter(order, q.answer) + '</strong>' +
      (shuffled ? ' (επιλογή ' + q.answer + ' στο αρχείο του ΑΣΕΠ)' : '') + '.</p>' +
      explanation(q) + notes(q) +
      '</div>';
  }

  // Ανασκόπηση μετά την εξέταση: επιλογές με την αρχική σειρά του ΑΣΕΠ.
  function reviewItem(q, mine, idx) {
    let status;
    if (!mine) status = '<p class="ans bad">Αναπάντητη.</p>';
    else if (mine === q.answer) status = '<p class="ans ok">Σωστά (' + esc(mine) + ').</p>';
    else status = '<p class="ans bad">Λάθος: απάντησες ' + esc(mine) + ', η επίσημη απάντηση είναι ' + esc(q.answer) + '.</p>';
    let opts = '<ul class="optlist">';
    L.forEach((l) => {
      const cls = l === q.answer ? 'is-correct' : (l === mine ? 'is-mine' : '');
      opts += '<li class="' + cls + '">' + l + '. ' + esc(q.options[l]) + '</li>';
    });
    opts += '</ul>';
    return '<li>' + stamp(q) +
      '<p class="qtext"><span class="muted">' + (idx + 1) + '.</span> ' + esc(q.question) + '</p>' +
      opts + status + explanation(q) + notes(q) + '</li>';
  }

  A.qview = { stamp, question, feedback, reviewItem, explanation, displayLetter };
})();
