/* Αποθήκευση στη συσκευή.
   - localStorage: πρόοδος, ιστορικό, ρυθμίσεις (κλειδιά με πρόθεμα "asep-prep:")
   Η εξαγωγή/εισαγωγή προόδου περιλαμβάνει όλα τα κλειδιά "asep-prep:" εκτός από
   όσα τελειώνουν σε ":session" (εξέταση σε εξέλιξη). Έτσι οι μελλοντικές ενότητες
   (Β1, Β2, Β3) μπαίνουν αυτόματα στην εξαγωγή.
   ΑΣΦΑΛΕΙΑ: στην εισαγωγή γίνονται δεκτά ΜΟΝΟ κλειδιά για τα οποία μια ενότητα έχει
   δηλώσει sanitizer (registerSanitizer). Ο sanitizer ξαναχτίζει την τιμή μόνο από
   αναμενόμενα πεδία και τύπους· ό,τι άλλο πετιέται. Κάθε νέα ενότητα πρέπει να
   δηλώνει sanitizer για τα κλειδιά της, αλλιώς τα δεδομένα της δεν εισάγονται. */
(function () {
  'use strict';
  const A = window.ASEP;
  const PREFIX = 'asep-prep:';
  const EXPORT_SCHEMA = 1;
  const MAX_IMPORT_CHARS = 5 * 1024 * 1024; // 5 MB

  let lsOk = true;
  try {
    const t = PREFIX + '__test';
    localStorage.setItem(t, '1');
    localStorage.removeItem(t);
  } catch (e) {
    lsOk = false;
  }

  const store = {
    available: lsOk,
    get(key, def) {
      if (!lsOk) return def;
      try {
        const v = localStorage.getItem(PREFIX + key);
        return v == null ? def : JSON.parse(v);
      } catch (e) {
        return def;
      }
    },
    set(key, value) {
      if (!lsOk) return false;
      try {
        localStorage.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch (e) {
        A.util.toast('Η αποθήκευση στη συσκευή απέτυχε (πιθανώς γέμισε ο χώρος).');
        return false;
      }
    },
    remove(key) {
      if (!lsOk) return;
      try { localStorage.removeItem(PREFIX + key); } catch (e) { /* τίποτα */ }
    },
    keys() {
      if (!lsOk) return [];
      const out = [];
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(PREFIX)) out.push(k.slice(PREFIX.length));
        }
      } catch (e) { /* τίποτα */ }
      return out;
    }
  };

  function exportableKeys() {
    return store.keys().filter((k) => !k.endsWith(':session') && !k.startsWith('__'));
  }

  // Συναρτήσεις συγχώνευσης ανά κλειδί, που δηλώνουν οι ενότητες.
  const mergers = Object.create(null);
  function registerMerger(key, fn) { mergers[key] = fn; }
  // Καθαρισμός εισερχόμενων τιμών ανά κλειδί. Επιστρέφει την καθαρή τιμή ή null (απόρριψη).
  const sanitizers = Object.create(null);
  function registerSanitizer(key, fn) { sanitizers[key] = fn; }
  // Ανάγνωση με τον ίδιο έλεγχο που γίνεται στην εισαγωγή (για δεδομένα που γράφτηκαν
  // στο localStorage από αλλού, π.χ. από άλλη σελίδα στην ίδια διεύθυνση).
  function getClean(key, def) {
    const v = store.get(key, null);
    if (v === null) return def;
    const fn = sanitizers[key];
    if (!fn) return v;
    try { const c = fn(v); return c === null || c === undefined ? def : c; } catch (e) { return def; }
  }

  // Βοηθητικά για sanitizers.
  const clean = {
    int(v, min, max) { v = Number(v); return Number.isInteger(v) && v >= min && v <= max ? v : null; },
    num(v, min, max) { v = Number(v); return typeof v === 'number' && isFinite(v) && v >= min && v <= max ? v : null; },
    bool(v) { return v === true || v === false ? v : null; },
    str(v, re, maxLen) { return typeof v === 'string' && v.length <= (maxLen || 100) && (!re || re.test(v)) ? v : null; },
    oneOf(v, list) { return list.indexOf(v) >= 0 ? v : null; }
  };

  function buildExport() {
    const keys = {};
    exportableKeys().forEach((k) => { keys[k] = store.get(k, null); });
    return {
      app: 'asep-prep',
      kind: 'progress-export',
      schema: EXPORT_SCHEMA,
      exported_at: new Date().toISOString(),
      app_version: self.APP_VERSION,
      bank_version: A.data && A.data.bank ? A.data.bank.meta.version : null,
      keys
    };
  }

  function parseImport(text) {
    if (typeof text !== 'string' || text.length > MAX_IMPORT_CHARS) {
      throw new Error('Το αρχείο είναι πολύ μεγάλο για αρχείο προόδου (όριο 5 MB).');
    }
    let obj;
    try {
      obj = JSON.parse(text);
    } catch (e) {
      throw new Error('Το κείμενο δεν είναι έγκυρο JSON.');
    }
    if (!obj || obj.app !== 'asep-prep' || obj.kind !== 'progress-export' || typeof obj.keys !== 'object' || !obj.keys) {
      throw new Error('Δεν είναι αρχείο εξαγωγής προόδου του ASEP-prep.');
    }
    if (obj.schema > EXPORT_SCHEMA) {
      throw new Error('Το αρχείο είναι από νεότερη έκδοση της εφαρμογής. Ενημέρωσε πρώτα την εφαρμογή.');
    }
    // Κρατάμε μόνο γνωστά κλειδιά, με καθαρισμένες τιμές.
    const keys = {};
    const dropped = [];
    Object.keys(obj.keys).forEach((k) => {
      const fn = sanitizers[k];
      let v = null;
      if (fn) { try { v = fn(obj.keys[k]); } catch (e) { v = null; } }
      if (v === null || v === undefined) dropped.push(k); else keys[k] = v;
    });
    if (!Object.keys(keys).length) throw new Error('Το αρχείο δεν περιέχει έγκυρα δεδομένα προόδου.');
    return { app: obj.app, kind: obj.kind, schema: obj.schema, keys, dropped };
  }

  // mode: 'merge' (κρατά και τα δύο) ή 'replace' (σβήνει τα τοπικά).
  function applyImport(obj, mode) {
    if (mode === 'replace') {
      exportableKeys().forEach((k) => store.remove(k));
      Object.keys(obj.keys).forEach((k) => store.set(k, obj.keys[k]));
      return;
    }
    Object.keys(obj.keys).forEach((k) => {
      const incoming = obj.keys[k];
      const local = store.get(k, null);
      if (local == null) {
        store.set(k, incoming);
      } else if (mergers[k]) {
        store.set(k, mergers[k](local, incoming));
      }
      // χωρίς merger (π.χ. ρυθμίσεις): κρατάμε τα τοπικά
    });
  }

  function clearAll() {
    store.keys().forEach((k) => store.remove(k));
  }

  A.store = store;
  // Ρυθμίσεις εμφάνισης (κοινές για όλες τις ενότητες).
  registerSanitizer('settings', (v) => {
    if (!v || typeof v !== 'object') return null;
    const theme = clean.oneOf(v.theme, ['auto', 'light', 'dark']);
    return theme ? { theme } : {};
  });

  store.getClean = getClean;
  A.backup = { buildExport, parseImport, applyImport, registerMerger, registerSanitizer, clean, clearAll, exportableKeys, MAX_IMPORT_CHARS };
})();
