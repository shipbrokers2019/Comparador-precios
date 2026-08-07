(function () {
  const DEFAULTS = {
    marca: {
      'CHE': 'CHEVROLET', 'CHEV': 'CHEVROLET', 'CHEVROLET': 'CHEVROLET',
      'FORD': 'FORD',
      'TOY': 'TOYOTA', 'TOYOTA': 'TOYOTA',
      'JEEP': 'JEEP',
      'DODGE': 'DODGE',
      'FIAT': 'FIAT',
      'RENAULT': 'RENAULT',
      'HYUNDAI': 'HYUNDAI',
      'MITSUBISHI': 'MITSUBISHI',
      'MAZDA': 'MAZDA',
      'KIA': 'KIA',
      'NISSAN': 'NISSAN',
      'HONDA': 'HONDA',
      'CHERY': 'CHERY',
      'SUZUKI': 'SUZUKI',
      'PEUGEOT': 'PEUGEOT',
      'VW': 'VOLKSWAGEN', 'VOLKSWAGEN': 'VOLKSWAGEN',
      'DAEWOO': 'DAEWOO',
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

  function extraerMarcaDeTexto(texto, dictionary) {
    // Fallback for files where the "marca" column holds the parts brand
    // (e.g. "EBITEN-BECO", "TSA") or is empty, but the real vehicle brand
    // is embedded in the repuesto description text (e.g. "ANILLOS DODGE
    // NEON MOTOR 2.0"). Split into words and match each one exactly
    // against the dictionary, so "FORDX" never falsely matches "FORD".
    const palabras = String(texto || '').toUpperCase().split(/[^A-ZÁÉÍÓÚÑ0-9]+/);
    for (let i = 0; i < palabras.length; i++) {
      if (dictionary[palabras[i]]) return dictionary[palabras[i]];
    }
    return null;
  }

  function normalizeItem(rawItem) {
    const dict = getAll();
    const marcaResult = normalizeTerm(rawItem.marca, dict.marca);
    const repuestoResult = normalizeTerm(rawItem.repuesto, dict.repuesto);

    let marca = marcaResult.value;
    let marcaNormalizada = marcaResult.matched;
    if (!marcaResult.matched) {
      const marcaExtraida = extraerMarcaDeTexto(rawItem.repuesto, dict.marca);
      if (marcaExtraida) {
        marca = marcaExtraida;
        marcaNormalizada = true;
      }
    }

    return {
      ...rawItem,
      marca,
      marcaNormalizada,
      repuesto: repuestoResult.value,
      repuestoNormalizado: repuestoResult.matched,
    };
  }

  window.App.dictionaries = { getAll, addSynonym, normalizeTerm, normalizeItem, extraerMarcaDeTexto };
})();
