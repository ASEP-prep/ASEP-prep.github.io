/* Ρυθμίσεις και «Σχετικά». */
(function () {
  'use strict';
  const A = window.ASEP;
  const U = A.util;
  const esc = U.esc;
  const K = () => A.knowledge;

  function themeSection() {
    const cur = A.store.getClean('settings', {}).theme || 'auto';
    const opts = [['auto', 'Όπως η συσκευή'], ['light', 'Φωτεινό'], ['dark', 'Σκούρο']];
    return '<h2>Εμφάνιση</h2><div class="chips" role="radiogroup" aria-label="Θέμα">' +
      opts.map((o) => '<label class="chip"><input type="radio" name="theme" value="' + o[0] + '" ' + (cur === o[0] ? 'checked' : '') + '><span>' + o[1] + '</span></label>').join('') +
      '</div>';
  }

  function rulesSection() {
    const r = K().rules();
    const d = K().defaultRules();
    const c = A.data.config;
    return '<h2>Κανόνες προσομοίωσης</h2>' +
      (c.status === 'provisional' ? '<div class="notice"><p><strong>Προσωρινές προεπιλογές.</strong> ' + esc(c.status_note || '') + '</p></div>' : '') +
      (K().customRulesOutdated() ? '<div class="notice bad"><p>Οι προεπιλογές της εφαρμογής άλλαξαν μετά τις δικές σου αλλαγές. Έλεγξε τους κανόνες ή πάτησε «Επαναφορά προεπιλογών».</p></div>' : '') +
      '<form id="rules" class="panel" novalidate style="margin-top:0.75rem">' +
      '<div class="grid2">' +
      '<div class="field"><label for="r-q">Ερωτήσεις</label><input type="number" id="r-q" min="1" max="' + A.data.questions.length + '" value="' + U.n(r.questions) + '" inputmode="numeric"><span class="hint">Προεπιλογή: ' + U.n(d.questions) + '</span></div>' +
      '<div class="field"><label for="r-t">Χρόνος (λεπτά)</label><input type="number" id="r-t" min="1" max="600" value="' + U.n(r.time_minutes) + '" inputmode="numeric"><span class="hint">Προεπιλογή: ' + U.n(d.time_minutes) + '</span></div>' +
      '<div class="field"><label for="r-p">Αρνητική βαθμολογία ανά λάθος</label><input type="number" id="r-p" min="0" max="1" step="0.05" value="' + U.n(r.penalty_fraction) + '" inputmode="decimal"><span class="hint">Κλάσμα της αξίας μιας σωστής. 0 = χωρίς. Προεπιλογή: ' + U.n(d.penalty_fraction) + '</span></div>' +
      '<div class="field"><label for="r-b">Βάση</label><input type="number" id="r-b" min="0" max="' + U.n(r.max_score) + '" step="0.5" value="' + (r.base_score === null ? '' : U.n(r.base_score)) + '" inputmode="decimal" placeholder="Χωρίς βάση"><span class="hint">Κενό = χωρίς βάση. Προεπιλογή: ' + (d.base_score === null ? 'χωρίς βάση' : U.n(d.base_score)) + '</span></div>' +
      '</div>' +
      '<div class="field"><label for="r-s">Επιλογή ερωτήσεων</label><select id="r-s">' +
      '<option value="random_all"' + (r.selection === 'random_all' ? ' selected' : '') + '>Τυχαία από όλη την τράπεζα</option>' +
      '<option value="equal_subjects"' + (r.selection === 'equal_subjects' ? ' selected' : '') + '>Περίπου ισόποσα από κάθε ενότητα</option>' +
      '</select><span class="hint">Η πραγματική κατανομή ανά ενότητα δεν είναι γνωστή.</span></div>' +
      '<label class="switch"><input type="checkbox" id="r-back" ' + (r.allow_back ? 'checked' : '') + '><span>Επιτρέπεται επιστροφή σε προηγούμενη ερώτηση<br><span class="small muted">Προεπιλογή: ' + (d.allow_back ? 'ναι' : 'όχι') + '</span></span></label>' +
      '<label class="switch"><input type="checkbox" id="r-sh" ' + (r.shuffle_options ? 'checked' : '') + '><span>Ανακάτεμα επιλογών<br><span class="small muted">Προεπιλογή: ' + (d.shuffle_options ? 'ναι' : 'όχι') + '</span></span></label>' +
      '<div class="row"><button type="submit" class="btn">Αποθήκευση κανόνων</button>' +
      '<button type="button" class="btn quiet" id="r-reset"' + (K().hasCustomRules() ? '' : ' disabled') + '>Επαναφορά προεπιλογών</button></div>' +
      '<p class="small muted" style="margin:0.6rem 0 0">Αρχείο κανόνων: έκδοση ' + esc(c.version) + '. Οι αλλαγές ισχύουν από την επόμενη προσομοίωση.</p>' +
      '</form>';
  }

  function backupSection() {
    return '<h2>Πρόοδος: αντίγραφο και μεταφορά</h2>' +
      '<p class="small">Η πρόοδος αποθηκεύεται μόνο σε αυτή τη συσκευή και σε αυτόν τον browser. Με την εξαγωγή κρατάς αντίγραφο ή τη μεταφέρεις σε άλλη συσκευή ή διεύθυνση της εφαρμογής.</p>' +
      '<div class="panel">' +
      '<h3 style="margin-top:0">Εξαγωγή</h3>' +
      '<div class="row"><button type="button" class="btn" id="ex-dl">Λήψη αρχείου</button>' +
      '<button type="button" class="btn ghost" id="ex-copy">Αντιγραφή ως κείμενο</button></div>' +
      '<p class="small muted" style="margin-top:0.5rem">Αν η λήψη δεν ξεκινήσει (π.χ. σε προεπισκόπηση), χρησιμοποίησε την αντιγραφή και επικόλλησε το κείμενο κάπου ασφαλές.</p>' +
      '<h3>Εισαγωγή</h3>' +
      '<div class="field"><label for="im-file">Από αρχείο</label><input type="file" id="im-file" accept="application/json,.json"></div>' +
      '<div class="field"><label for="im-text">ή επικόλληση κειμένου</label><textarea id="im-text" spellcheck="false" placeholder="{&quot;app&quot;:&quot;asep-prep&quot;, …}"></textarea></div>' +
      '<div class="chips" role="radiogroup" aria-label="Τρόπος εισαγωγής">' +
      '<label class="chip"><input type="radio" name="im-mode" value="merge" checked><span>Συγχώνευση με την τρέχουσα</span></label>' +
      '<label class="chip"><input type="radio" name="im-mode" value="replace"><span>Αντικατάσταση της τρέχουσας</span></label></div>' +
      '<p class="small muted" style="margin-top:0.5rem">Συγχώνευση: για κάθε ερώτηση κρατιέται η πιο πρόσφατη απάντηση από τις δύο συσκευές και τα ιστορικά προσομοιώσεων ενώνονται. Οι ρυθμίσεις αυτής της συσκευής δεν αλλάζουν.</p>' +
      '<div class="row" style="margin-top:0.75rem"><button type="button" class="btn" id="im-go">Εισαγωγή προόδου</button></div>' +
      '<h3>Διαγραφή</h3>' +
      '<button type="button" class="btn danger" id="reset">Διαγραφή όλης της προόδου</button>' +
      '</div>';
  }

  function bankSection() {
    const D = A.data;
    return '<h2>Τράπεζα θεμάτων</h2>' +
      '<div class="panel">' +
      '<p class="small">Έκδοση <strong>' + esc(D.bank.meta.version) + '</strong>, ' + U.fmtNum(D.questions.length) + ' ερωτήσεις.</p>' +
      '<p class="small muted">Επεξηγήσεις: ' + (D.explanationFiles.length ? D.explanationFiles.map((f) => esc(f.file) + ' (' + U.n(f.count) + ')').join(', ') : 'δεν υπάρχουν ακόμη') + '.</p>' +
      '<p class="small muted" style="margin-bottom:0">Διορθώσεις και νέες εκδόσεις της τράπεζας έρχονται αυτόματα με την εφαρμογή, όταν υπάρχει σύνδεση.</p>' +
      '</div>';
  }

  function render(root) {
    root.innerHTML = '<h1>Ρυθμίσεις</h1>' + themeSection() + rulesSection() + backupSection() + bankSection() +
      '<p style="margin-top:1.5rem"><a href="#about">Σχετικά με την εφαρμογή</a></p>';

    // Θέμα
    root.querySelectorAll('[name="theme"]').forEach((r) => r.addEventListener('change', () => {
      const s = A.store.getClean('settings', {}) || {};
      s.theme = r.value;
      A.store.set('settings', s);
      A.applyTheme();
    }));

    // Κανόνες
    root.querySelector('#rules').addEventListener('submit', (e) => {
      e.preventDefault();
      const num = (id) => Number(root.querySelector(id).value);
      const baseRaw = root.querySelector('#r-b').value.trim();
      const vals = {
        questions: Math.round(num('#r-q')),
        time_minutes: num('#r-t'),
        penalty_fraction: num('#r-p'),
        base_score: baseRaw === '' ? null : Number(baseRaw.replace(',', '.')),
        selection: root.querySelector('#r-s').value,
        allow_back: root.querySelector('#r-back').checked,
        shuffle_options: root.querySelector('#r-sh').checked
      };
      if (!(vals.questions >= 1 && vals.questions <= A.data.questions.length)) return U.toast('Οι ερωτήσεις πρέπει να είναι από 1 έως ' + A.data.questions.length + '.');
      if (!(vals.time_minutes >= 1 && vals.time_minutes <= 600)) return U.toast('Ο χρόνος πρέπει να είναι από 1 έως 600 λεπτά.');
      if (!(vals.penalty_fraction >= 0 && vals.penalty_fraction <= 1)) return U.toast('Η αρνητική βαθμολογία πρέπει να είναι από 0 έως 1.');
      if (vals.base_score !== null && !(vals.base_score >= 0 && vals.base_score <= 100)) return U.toast('Η βάση πρέπει να είναι από 0 έως 100.');
      K().setCustomRules(vals);
      U.toast(K().hasCustomRules() ? 'Οι κανόνες αποθηκεύτηκαν.' : 'Οι κανόνες είναι ίδιοι με τις προεπιλογές.');
      render(root);
    });
    root.querySelector('#r-reset').addEventListener('click', () => {
      K().setCustomRules({});
      U.toast('Επαναφέρθηκαν οι προεπιλογές.');
      render(root);
    });

    // Εξαγωγή
    const exportText = () => JSON.stringify(A.backup.buildExport());
    root.querySelector('#ex-dl').addEventListener('click', () => {
      if (window.ASEP_PREVIEW) return U.toast('Στην προεπισκόπηση η λήψη αρχείου δεν λειτουργεί. Χρησιμοποίησε την «Αντιγραφή ως κείμενο».');
      const ok = U.download('asep-prep-progress-' + U.today() + '.json', exportText());
      U.toast(ok ? 'Το αρχείο δημιουργήθηκε.' : 'Η λήψη δεν είναι διαθέσιμη εδώ. Χρησιμοποίησε την αντιγραφή.');
    });
    root.querySelector('#ex-copy').addEventListener('click', async () => {
      const ok = await U.copyText(exportText());
      if (ok) U.toast('Αντιγράφηκε στο πρόχειρο.');
      else {
        const ta = root.querySelector('#im-text');
        ta.value = exportText();
        ta.focus();
        ta.select();
        U.toast('Η αντιγραφή δεν επιτρέπεται εδώ. Το κείμενο είναι επιλεγμένο στο πεδίο εισαγωγής.');
      }
    });

    // Εισαγωγή
    root.querySelector('#im-go').addEventListener('click', async () => {
      const fileEl = root.querySelector('#im-file');
      let text = root.querySelector('#im-text').value.trim();
      try {
        if (fileEl.files && fileEl.files[0]) {
          if (fileEl.files[0].size > A.backup.MAX_IMPORT_CHARS) throw new Error('Το αρχείο είναι πολύ μεγάλο για αρχείο προόδου (όριο 5 MB).');
          text = await U.readFile(fileEl.files[0]);
        }
        if (!text) return U.toast('Διάλεξε αρχείο ή επικόλλησε κείμενο.');
        const obj = A.backup.parseImport(text);
        const mode = root.querySelector('[name="im-mode"]:checked').value;
        if (mode === 'replace') {
          const ok = await U.confirmDialog('Η τρέχουσα πρόοδος σε αυτή τη συσκευή θα αντικατασταθεί.', 'Αντικατάσταση', { danger: true });
          if (!ok) return;
        }
        A.backup.applyImport(obj, mode);
        K().reload();
        A.applyTheme();
        U.toast('Η πρόοδος εισήχθη (' + (mode === 'replace' ? 'αντικατάσταση' : 'συγχώνευση') + ').' +
          (obj.dropped.length ? ' Αγνοήθηκαν μη έγκυρα δεδομένα: ' + obj.dropped.length + ' ενότητες.' : ''));
        render(root);
      } catch (e) {
        U.confirmDialog(e.message, 'OK', { noCancel: true });
      }
    });

    // Διαγραφή
    root.querySelector('#reset').addEventListener('click', async () => {
      const ok = await U.confirmDialog('Θα διαγραφούν όλες οι απαντήσεις, το ιστορικό και οι ρυθμίσεις σε αυτή τη συσκευή. Δεν αναιρείται.\nΚάνε πρώτα εξαγωγή αν θέλεις αντίγραφο.', 'Διαγραφή', { danger: true });
      if (!ok) return;
      A.backup.clearAll();
      K().reload();
      A.applyTheme();
      U.toast('Η πρόοδος διαγράφηκε.');
      render(root);
    });

  }

  function renderAbout(root) {
    const D = A.data;
    root.innerHTML = '<h1>Σχετικά</h1>' +
      '<div class="notice bad"><p><strong>Ανεπίσημη εφαρμογή.</strong> Δεν έχει καμία σχέση με το ΑΣΕΠ ή άλλον δημόσιο φορέα. ' +
      'Για τους κανόνες του διαγωνισμού ισχύει μόνο η προκήρυξη και οι ανακοινώσεις του <a href="https://www.asep.gr" rel="noopener">ΑΣΕΠ</a>.</p></div>' +
      '<h2>Πηγές</h2>' +
      '<p>Οι ερωτήσεις προέρχονται από το επίσημο Μητρώο Θεμάτων Γνώσεων του ΑΣΕΠ (11 αρχεία). Οι σωστές απαντήσεις είναι οι επίσημες, όπως επισημαίνονται με κόκκινο στα αρχεία του ΑΣΕΠ. ' +
      'Κάθε ερώτηση δείχνει το αρχείο και τον αριθμό της, με την ετικέτα <span class="stamp" style="margin:0"><b>[ΑΣΕΠ]</b></span>.</p>' +
      '<p>Επεξηγήσεις που δεν προέρχονται από το ΑΣΕΠ σημειώνονται [ΓΝΩΣΗ]. Όσες απαντήσεις μπορεί να μην ισχύουν πια (π.χ. λόγω αλλαγής νόμου) σημειώνονται [ΑΒΕΒΑΙΟ]. Η νομοθεσία αλλάζει, οπότε έλεγχε πάντα τα ισχύοντα κείμενα.</p>' +
      '<h2>Εγκατάσταση</h2>' +
      '<div class="notice"><p>' + esc(A.INSTALL_TERMS) + '</p></div>' +
      '<p class="small">Στο Android: άνοιξε το <strong>https://asep-prep.github.io/</strong> στο Chrome και επίλεξε «Εγκατάσταση εφαρμογής» ' +
      'ή «Προσθήκη στην αρχική οθόνη» από το μενού (⋮). Η εφαρμογή τρέχει μέσα στον browser και δεν ζητά άδειες πρόσβασης ' +
      'σε αρχεία, επαφές, κάμερα ή τοποθεσία.</p>' +
      '<h2>Κανόνες προσομοίωσης</h2>' +
      '<p>Οι κανόνες (πλήθος ερωτήσεων, χρόνος, βαθμολόγηση) είναι προσωρινοί μέχρι να δημοσιευτεί η προκήρυξη, και αλλάζουν από τις Ρυθμίσεις.</p>' +
      '<h2>Τα δεδομένα σου</h2>' +
      '<p>Η πρόοδος αποθηκεύεται μόνο στη συσκευή σου και δεν στέλνεται πουθενά. Αν καθαρίσεις τα δεδομένα του browser, χάνεται· κράτα αντίγραφο με την εξαγωγή στις Ρυθμίσεις.</p>' +
      '<h2>Εκδόσεις</h2>' +
      '<div class="table-wrap"><table><tbody>' +
      '<tr><th scope="row">Εφαρμογή</th><td>' + esc(self.APP_VERSION) + '</td></tr>' +
      '<tr><th scope="row">Τράπεζα θεμάτων</th><td>' + esc(D.bank.meta.version) + ', ' + U.fmtNum(D.questions.length) + ' ερωτήσεις</td></tr>' +
      '<tr><th scope="row">Κανόνες εξέτασης</th><td>' + esc(D.config.version) + '</td></tr>' +
      '</tbody></table></div>' +
      '<h2>Βρήκες λάθος;</h2>' +
      '<p>Άνοιξε ένα <a href="https://github.com/ASEP-prep/ASEP-prep.github.io/issues" rel="noopener">Issue στο GitHub</a> με το αρχείο και τον αριθμό της ερώτησης.</p>' +
      '<p class="small muted">Το υλικό του Μητρώου Θεμάτων Γνώσεων ανήκει στο ΑΣΕΠ και δημοσιεύεται από αυτό. Η εφαρμογή απλώς το οργανώνει για εξάσκηση.</p>';
  }

  A.registry.addRoute('prefs', { title: 'Ρυθμίσεις', parent: 'home', render });
  A.registry.addRoute('about', { title: 'Σχετικά', parent: 'home', render: renderAbout });
})();
