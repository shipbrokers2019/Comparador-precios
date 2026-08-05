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
    const clean = String(term || '').trim().toUpperCase();
    if (dictionary[clean]) {
      return { value: dictionary[clean], matched: true };
    }
    const substringMatches = Object.keys(dictionary).filter(
      (key) => clean.includes(key) || key.includes(clean)
    );
    const distinctValues = [...new Set(substringMatches.map((k) => dictionary[k]))];
    if (distinctValues.length === 1) {
      return { value: distinctValues[0], matched: true };
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
