(function () {
  const DEFAULTS = {
    marca: {
      'CHE': 'CHEVROLET', 'CHEV': 'CHEVROLET', 'CHEVROLET': 'CHEVROLET', 'GM': 'CHEVROLET',
      'FORD': 'FORD',
      'TOY': 'TOYOTA', 'TOYOTA': 'TOYOTA',
      'JEEP': 'JEEP',
      'DOD': 'DODGE', 'DODGE': 'DODGE',
      'FIAT': 'FIAT',
      'RENAULT': 'RENAULT',
      'HYU': 'HYUNDAI', 'HYUNDAI': 'HYUNDAI',
      'MIT': 'MITSUBISHI', 'MITSUBISHI': 'MITSUBISHI',
      'MAZDA': 'MAZDA',
      'KIA': 'KIA',
      'NISSAN': 'NISSAN',
      'HONDA': 'HONDA',
      'CHERY': 'CHERY',
      'SUZ': 'SUZUKI', 'SUZUKI': 'SUZUKI',
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
      // Neither the marca column nor the repuesto text tell us the actual
      // vehicle brand — leave it blank rather than showing the parts
      // brand (or raw junk) as if it were the vehicle brand.
      const marcaExtraida = extraerMarcaDeTexto(rawItem.repuesto, dict.marca);
      marca = marcaExtraida || '';
      marcaNormalizada = !!marcaExtraida;
    }

    return {
      ...rawItem,
      marca,
      marcaNormalizada,
      // The parts manufacturer's own brand (e.g. "TSA", "EBITEN-BECO"),
      // kept separate from the vehicle brand above — some files put this
      // in the "marca" column, which is what marcaExtraida works around.
      marcaRepuesto: String(rawItem.marca || '').trim(),
      repuesto: repuestoResult.value,
      repuestoNormalizado: repuestoResult.matched,
    };
  }

  window.App.dictionaries = { getAll, addSynonym, normalizeTerm, normalizeItem, extraerMarcaDeTexto };
})();
