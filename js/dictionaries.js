(function () {
  const DEFAULTS = {
    marca: {
      'CHE': 'CHEVROLET', 'CHEV': 'CHEVROLET', 'CHEVROLET': 'CHEVROLET',
      'FORD': 'FORD',
      'TOY': 'TOYOTA', 'TOYOTA': 'TOYOTA',
    },
    repuesto: {
      'CONCHA BIELA': 'CONCHAS DE BIELA', 'CONCHAS DE BIELA': 'CONCHAS DE BIELA',
      'CONCHA BANCADA': 'CONCHAS DE BANCADA', 'CONCHAS DE BANCADA': 'CONCHAS DE BANCADA',
      'AXIAL': 'AXIALES', 'AXIALES': 'AXIALES',
      'PISTON': 'PISTONES', 'PISTONES': 'PISTONES',
      'CIGUENAL': 'CIGUENALES', 'CIGUENALES': 'CIGUENALES',
    },
  };

  function getAll() {
    return App.storage.get(App.storage.KEYS.DICCIONARIOS, DEFAULTS);
  }

  function addSynonym(tipo, alias, valorCanonico) {
    const all = getAll();
    all[tipo][alias.trim().toUpperCase()] = valorCanonico.trim().toUpperCase();
    App.storage.set(App.storage.KEYS.DICCIONARIOS, all);
  }

  function normalizeTerm(term, dictionary) {
    // I6 fix: only match on an exact (case-insensitive, trimmed) key lookup.
    // Substring matching created false positives (e.g. "PISTON 0.30" and
    // "PISTON STD 1.00 MM" both merging into "PISTONES"). Per spec, ambiguous
    // or partial terms must always be flagged for manual review, never guessed.
    const clean = String(term || '').trim().toUpperCase();
    if (dictionary[clean]) {
      return { value: dictionary[clean], matched: true };
    }
    return { value: clean, matched: false };
  }

  function normalizeItem(rawItem) {
    const dict = getAll();
    const marcaResult = normalizeTerm(rawItem.marca, dict.marca);
    const repuestoResult = normalizeTerm(rawItem.repuesto, dict.repuesto);
    return {
      ...rawItem,
      marca: marcaResult.value,
      marcaNormalizada: marcaResult.matched,
      repuesto: repuestoResult.value,
      repuestoNormalizado: repuestoResult.matched,
    };
  }

  window.App.dictionaries = { getAll, addSynonym, normalizeTerm, normalizeItem };
})();
