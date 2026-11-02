/* Εκκίνηση, πλοήγηση, αρχική οθόνη, θέμα, ενημερώσεις εφαρμογής. */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const view = document.getElementById('view');

  /* ---------- Θέμα ---------- */
  function applyTheme() {
    const t = (A.store.getClean('settings', {}) || {}).theme || 'auto';
    const root = document.documentElement;
    if (t === 'light' || t === 'dark') root.setAttribute('data-theme', t);
    else root.removeAttribute('data-theme');
    const dark = t === 'dark' || (t === 'auto' && window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
    // Η γραμμή κατάστασης του κινητού ακολουθεί το χρώμα της πάνω μπάρας.
    document.querySelectorAll('meta[name="theme-color"]').forEach((m) => {
      if (t === 'auto') m.setAttribute('content', m.media.includes('dark') ? '#18202D' : '#FFFFFF');
      else m.setAttribute('content', dark ? '#18202D' : '#FFFFFF');
    });
  }
  if (window.matchMedia) {
    const mq = matchMedia('(prefers-color-scheme: dark)');
    if (mq.addEventListener) mq.addEventListener('change', applyTheme);
  }

  function updateFooter() {
    document.getElementById('ver-app').textContent = 'Εφαρμογή v' + self.APP_VERSION;
    document.getElementById('ver-bank').textContent = A.data.bank
      ? 'Τράπεζα ' + A.data.bank.meta.version
      : '';
  }

  /* ---------- Εγκατάσταση (PWA) ---------- */
  const INSTALL_TERMS =
    'Η εγκατάσταση και η χρήση της εφαρμογής γίνονται με δική σου ευθύνη. Η εφαρμογή είναι ανεπίσημη, ' +
    'δεν σχετίζεται με το ΑΣΕΠ και παρέχεται «ως έχει», χωρίς καμία εγγύηση για την ακρίβεια του περιεχομένου ' +
    'ή για τη λειτουργία της.\n\n' +
    'Η γνήσια εφαρμογή εγκαθίσταται ΜΟΝΟ από τη διεύθυνση https://asep-prep.github.io/ μέσω του browser. ' +
    'Δεν διανέμεται ποτέ ως αρχείο APK, ούτε μέσω άλλης διεύθυνσης, και δεν ζητά ποτέ κωδικούς (π.χ. TAXISnet).';
  // Εμφανίζουμε πρώτα τους όρους, μετά το παράθυρο εγκατάστασης του browser.
  let booted = false;
  let installEvent = A.pendingInstall || null;
  A.onInstallAvailable = () => {
    installEvent = A.pendingInstall;
    if (booted && routeName() === 'home') show();
  };
  window.addEventListener('appinstalled', () => { installEvent = null; A.pendingInstall = null; if (booted && routeName() === 'home') show(); });
  async function install() {
    if (!installEvent) return;
    const ok = await U.confirmDialog(INSTALL_TERMS, 'Αποδέχομαι, εγκατάσταση', { cancelLabel: 'Άκυρο' });
    if (!ok || !installEvent) return;
    const ev = installEvent;
    installEvent = null;
    A.pendingInstall = null;
    try { await ev.prompt(); } catch (e) { /* ο browser αρνήθηκε */ }
    if (routeName() === 'home') show();
  }

  /* ---------- Αρχική ---------- */
  const STATUS = { active: 'Διαθέσιμο', planned: 'Σχεδιάζεται', waiting: 'Αναμένεται η επίσημη μορφή' };
  function renderHome(root) {
    const parts = A.data.sections.map((s) => {
      const active = s.status === 'active' && A.registry.route(s.id);
      const inner =
        '<span class="part-code" aria-hidden="true">' + esc(s.code) + '</span>' +
        '<span class="part-title">' + esc(s.code) + '. ' + esc(s.title) + '</span>' +
        '<p class="part-blurb">' + esc(s.blurb || '') + '</p>' +
        '<span class="status' + (active ? ' active' : '') + '">' + esc(STATUS[s.status] || s.status) + '</span>';
      return active
        ? '<li><a class="part" href="#' + esc(s.id) + '">' + inner + '</a></li>'
        : '<li><div class="part inactive">' + inner + '</div></li>';
    }).join('');
    const sess = A.knowledge.session();
    root.innerHTML =
      '<h1>Εξάσκηση για τον Πανελλήνιο Γραπτό Διαγωνισμό ΑΣΕΠ</h1>' +
      '<p class="lead">Για τον επόμενο κύκλο (αναμένεται το 2027). Η δομή της εξέτασης θα επιβεβαιωθεί με την προκήρυξη· μέχρι τότε οι κανόνες της προσομοίωσης είναι προσωρινοί.</p>' +
      '<div class="notice"><p><strong>Ανεπίσημη εφαρμογή.</strong> Δεν σχετίζεται με το ΑΣΕΠ. Οι ερωτήσεις και οι απαντήσεις προέρχονται από το επίσημο Μητρώο Θεμάτων Γνώσεων· οι επεξηγήσεις, όπου υπάρχουν, δεν είναι επίσημο υλικό.</p></div>' +
      (sess && !sess.finished ? '<div class="notice info"><p>Έχεις προσομοίωση σε εξέλιξη. <a href="#exam">Συνέχεια</a></p></div>' : '') +
      (window.ASEP_PREVIEW ? '<div class="notice info"><p><strong>Προεπισκόπηση.</strong> Η κανονική εφαρμογή είναι στο <a href="https://asep-prep.github.io/" rel="noopener">asep-prep.github.io</a>. Εδώ δεν λειτουργούν η εγκατάσταση, η χρήση χωρίς σύνδεση και η λήψη αρχείου· για αντίγραφο της προόδου χρησιμοποίησε την «Αντιγραφή ως κείμενο».</p></div>' : '') +
      (installEvent && !window.ASEP_PREVIEW ? '<div class="notice info"><p>Μπορείς να εγκαταστήσεις την εφαρμογή σε αυτή τη συσκευή.</p>' +
        '<p><button type="button" class="btn small" id="btn-install">Εγκατάσταση</button></p></div>' : '') +
      '<ul class="parts">' + parts + '</ul>' +
      (A.store.available ? '' : '<div class="notice bad" style="margin-top:1rem"><p>Ο browser δεν επιτρέπει αποθήκευση. Η πρόοδος δεν θα κρατηθεί μετά το κλείσιμο.</p></div>');
    const ib = root.querySelector('#btn-install');
    if (ib) ib.addEventListener('click', install);
  }

  /* ---------- Πλοήγηση ---------- */
  const homeRoute = { title: '', parent: null, render: renderHome };
  let current = null;

  // Μόνο απλά ονόματα οθονών (γράμματα, αριθμοί, παύλες). Οτιδήποτε άλλο → αρχική.
  function routeName() {
    const h = location.hash.replace(/^#/, '');
    return /^[a-z0-9-]{1,40}$/.test(h) ? h : 'home';
  }
  function show() {
    const name = routeName();
    const route = name === 'home' ? homeRoute : A.registry.route(name);
    if (!route || typeof route.render !== 'function') {
      if (location.hash && location.hash !== '#home') { location.replace('#home'); return; }
      return;
    }
    if (current && current.leave) {
      try { current.leave(); } catch (e) { /* τίποτα */ }
    }
    current = route;
    const back = document.getElementById('btn-back');
    back.hidden = !route.parent;
    back.onclick = () => { location.hash = route.parent; };
    document.getElementById('topbar-title').textContent = route.title || '';
    document.title = (route.title ? route.title + ' – ' : '') + 'ASEP-prep (ανεπίσημη εξάσκηση ΑΣΕΠ)';
    try {
      route.render(view);
    } catch (e) {
      console.error(e);
      view.innerHTML = '<div class="notice bad"><p>Κάτι πήγε στραβά σε αυτή την οθόνη: ' + esc(e.message) + '</p></div><p><a href="#home">Αρχική</a></p>';
    }
    if (routeName() === name) {
      window.scrollTo(0, 0);
      try { view.focus({ preventScroll: true }); } catch (e) { /* τίποτα */ }
    }
  }

  /* ---------- Service worker ---------- */
  function registerSW() {
    // Η προεπισκόπηση (ένα αρχείο με ενσωματωμένα δεδομένα) δεν χρησιμοποιεί service worker.
    if (window.ASEP_PREVIEW) return;
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    const banner = document.getElementById('update-banner');
    // Επαναφόρτωση μόνο όταν ο χρήστης πατήσει «Ανανέωση». Στην πρώτη εγκατάσταση
    // ο service worker αναλαμβάνει τη σελίδα χωρίς επαναφόρτωση.
    let userAskedUpdate = false;
    const showBanner = (reg) => {
      banner.hidden = false;
      document.getElementById('btn-update').onclick = () => {
        userAskedUpdate = true;
        if (reg.waiting) reg.waiting.postMessage('skipWaiting');
        else location.reload();
      };
    };
    navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
      if (reg.waiting && navigator.serviceWorker.controller) showBanner(reg);
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) showBanner(reg);
        });
      });
    }).catch(() => { /* π.χ. προεπισκόπηση: η εφαρμογή δουλεύει χωρίς offline */ });
    let reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloading || !userAskedUpdate) return;
      reloading = true;
      location.reload();
    });
  }

  /* ---------- Εκκίνηση ---------- */
  // Προστασία από clickjacking: η εφαρμογή δεν λειτουργεί μέσα σε πλαίσιο (iframe) άλλης σελίδας.
  // (Το GitHub Pages δεν επιτρέπει την κεφαλίδα X-Frame-Options, ούτε το frame-ancestors σε <meta>.)
  // Εξαίρεση: η προεπισκόπηση του claude.ai, που εμφανίζεται πάντα μέσα σε πλαίσιο.
  function framed() {
    try { return window.top !== window.self; } catch (e) { return true; }
  }

  async function boot() {
    applyTheme();
    if (framed() && !window.ASEP_PREVIEW) {
      document.body.innerHTML = '<main style="padding:1.5rem"><h1>ASEP-prep</h1>' +
        '<p>Για την ασφάλειά σου, η εφαρμογή δεν λειτουργεί μέσα σε άλλη ιστοσελίδα.</p>' +
        '<p><a href="' + esc(location.href.split('#')[0]) + '" target="_blank" rel="noopener noreferrer">Άνοιξέ τη σε νέα καρτέλα</a></p></main>';
      return;
    }
    document.getElementById('ver-app').textContent = 'Εφαρμογή v' + self.APP_VERSION;
    try {
      await A.data.load();
    } catch (e) {
      console.error(e);
      const fileProto = location.protocol === 'file:';
      view.innerHTML = '<h1>Τα δεδομένα δεν φορτώθηκαν</h1>' +
        '<div class="notice bad"><p>' + (fileProto
          ? 'Η εφαρμογή άνοιξε απευθείας από αρχείο. Άνοιξέ τη μέσω διακομιστή, π.χ. Live Server στο VS Code ή τη διεύθυνση του GitHub Pages.'
          : 'Έλεγξε τη σύνδεση και δοκίμασε ξανά. Αν το πρόβλημα συνεχίζεται, ίσως λείπει κάποιο αρχείο από τον φάκελο data/.') +
        '</p><p class="small">' + esc(e.message) + '</p></div>' +
        '<button type="button" class="btn" id="btn-retry">Δοκίμασε ξανά</button>';
      // χωρίς inline onclick: το Content-Security-Policy επιτρέπει μόνο κώδικα από τα αρχεία της εφαρμογής
      document.getElementById('btn-retry').addEventListener('click', () => location.reload());
      registerSW();
      return;
    }
    updateFooter();
    if (A.knowledgeExam.finishIfExpired()) {
      if (routeName() === 'exam') location.replace('#result');
      else A.data.warnings.unshift('Ο χρόνος της προσομοίωσης έληξε όσο η εφαρμογή ήταν κλειστή· βαθμολογήθηκε και είναι στο ιστορικό.');
    }
    A.data.warnings.forEach((w) => U.toast(w));
    window.addEventListener('hashchange', show);
    booted = true;
    show();
    registerSW();
  }

  A.INSTALL_TERMS = INSTALL_TERMS;
  A.applyTheme = applyTheme;
  A.updateFooter = updateFooter;
  boot();
})();
