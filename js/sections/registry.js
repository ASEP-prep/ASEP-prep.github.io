/* Μητρώο ενοτήτων. Κάθε ενότητα (Α, και αργότερα Β1/Β2/Β3) δηλώνει εδώ τις
   οθόνες της. Μια οθόνη: { title, parent, render(root) , leave() }.
   Τα ονόματα οθονών είναι απλά (π.χ. "practice"), χωρίς παραμέτρους στο #. */
(function () {
  'use strict';
  const A = window.ASEP;
  // Χωρίς prototype: ονόματα όπως «__proto__» ή «constructor» δεν αντιστοιχούν σε οθόνη.
  const routes = Object.create(null);
  const sections = Object.create(null);

  function register(def) {
    sections[def.id] = def;
    Object.keys(def.routes || {}).forEach((name) => {
      if (routes[name]) console.warn('Διπλή οθόνη:', name);
      routes[name] = Object.assign({ section: def.id }, def.routes[name]);
    });
  }

  A.registry = {
    register,
    route: (name) => routes[name] || null,
    section: (id) => sections[id] || null,
    addRoute: (name, r) => { routes[name] = r; }
  };
  // Κοινή κατάσταση πλοήγησης (αντί για παραμέτρους στο #).
  A.nav = A.nav || {};
})();
