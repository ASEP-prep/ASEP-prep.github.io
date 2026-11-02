/* Βοηθητικές συναρτήσεις (χωρίς εξωτερικές βιβλιοθήκες). */
(function () {
  'use strict';
  const A = (window.ASEP = window.ASEP || {});

  // Το σήμα «επιτρέπεται εγκατάσταση» μπορεί να έρθει νωρίς· το κρατάμε εδώ
  // (πρώτο αρχείο της σελίδας) και το χειρίζεται το app.js.
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    A.pendingInstall = e;
    if (A.onInstallAvailable) A.onInstallAvailable();
  });

  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC[c]);
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  // Σύντομο hash κειμένου (djb2) για εντοπισμό αλλαγών σε ερωτήσεις.
  function hash(str) {
    let h = 5381;
    for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
    return (h >>> 0).toString(36);
  }

  function fmtDate(ts) {
    return new Date(ts).toLocaleString('el-GR', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  }
  function fmtClock(sec) {
    sec = Math.max(0, Math.ceil(sec));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }
  function fmtNum(n, digits) {
    return Number(n).toLocaleString('el-GR', { maximumFractionDigits: digits == null ? 0 : digits });
  }
  function pct(a, b) { a = Number(a); b = Number(b); return b && isFinite(a) && isFinite(b) ? Math.round((100 * a) / b) : 0; }
  // Αριθμός για εμφάνιση σε HTML: πάντα πραγματικός αριθμός, ποτέ κείμενο από τα δεδομένα.
  function n(v) { v = Number(v); return isFinite(v) ? String(v) : '0'; }

  let toastTimer = null;
  function toast(msg) {
    const el = document.getElementById('toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 3200);
  }

  let closeCurrent = null;
  // Κλείνει ανοιχτό παράθυρο επιβεβαίωσης (ως «Άκυρο»).
  function closeDialog() { if (closeCurrent) { const f = closeCurrent; closeCurrent = null; f(); } }
  // Παράθυρο επιβεβαίωσης. Επιστρέφει Promise<boolean>.
  function confirmDialog(message, okLabel, opts) {
    opts = opts || {};
    return new Promise((resolve) => {
      const wrap = document.getElementById('modal');
      wrap.innerHTML =
        '<div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-msg">' +
        '<p id="modal-msg">' + esc(message) + '</p>' +
        '<div class="row">' +
        (opts.noCancel ? '' : '<button type="button" class="btn quiet" data-r="0">' + esc(opts.cancelLabel || 'Άκυρο') + '</button>') +
        '<button type="button" class="btn ' + (opts.danger ? 'danger' : '') + '" data-r="1">' + esc(okLabel || 'OK') + '</button>' +
        '</div></div>';
      wrap.hidden = false;
      const prev = document.activeElement;
      const done = (v) => {
        closeCurrent = null;
        wrap.hidden = true;
        wrap.innerHTML = '';
        document.removeEventListener('keydown', onKey);
        if (prev && prev.focus) prev.focus();
        resolve(v);
      };
      const onKey = (e) => { if (e.key === 'Escape' && !opts.noCancel) done(false); };
      closeCurrent = () => done(false);
      document.addEventListener('keydown', onKey);
      wrap.querySelectorAll('button').forEach((b) => b.addEventListener('click', () => done(b.dataset.r === '1')));
      const ok = wrap.querySelector('[data-r="1"]');
      if (ok) ok.focus();
    });
  }

  function download(filename, text, mime) {
    try {
      const blob = new Blob([text], { type: mime || 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 2000);
      return true;
    } catch (e) {
      return false;
    }
  }

  async function copyText(text) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) { /* συνέχεια στη λύση ανάγκης */ }
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch (e) {
      return false;
    }
  }

  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(String(r.result));
      r.onerror = () => reject(new Error('Η ανάγνωση του αρχείου απέτυχε.'));
      r.readAsText(file, 'utf-8');
    });
  }

  function today() {
    const d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  A.util = { esc, shuffle, hash, fmtDate, fmtClock, fmtNum, pct, n, toast, confirmDialog, closeDialog, download, copyText, readFile, today };
})();
