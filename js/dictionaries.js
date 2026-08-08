(function () {
  const DEFAULTS = {
    marca: {
      'CHE': 'CHEVROLET', 'CHEV': 'CHEVROLET', 'CHEVROLET': 'CHEVROLET', 'GM': 'CHEVROLET',
      'FORD': 'FORD',
      'TOY': 'TOYOTA', 'TOYOTA': 'TOYOTA',
      'JEEP': 'JEEP',
      'DOD': 'DODGE', 'DODGE': 'DODGE', 'CHRYSLER': 'DODGE',
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
    // Model name → vehicle brand, used as a second fallback when the text
    // mentions a model ("SILVERADO", "GRAND VITARA") but not the brand
    // word itself. Common models sold in Venezuela, grouped by brand.
    modelo: {
      // CHEVROLET
      'CAVALIER': 'CHEVROLET', 'EPICA': 'CHEVROLET', 'SILVERADO': 'CHEVROLET',
      'TRAIL BLAZER': 'CHEVROLET', 'TRAILBLAZER': 'CHEVROLET', 'MONZA': 'CHEVROLET',
      'ORLANDO': 'CHEVROLET', 'COLORADO': 'CHEVROLET', 'AVEO': 'CHEVROLET',
      'OPTRA': 'CHEVROLET', 'CORSA': 'CHEVROLET', 'MERIVA': 'CHEVROLET',
      'ASTRA': 'CHEVROLET', 'VECTRA': 'CHEVROLET', 'CRUZE': 'CHEVROLET',
      'SPARK': 'CHEVROLET', 'BLAZER': 'CHEVROLET', 'CAPTIVA': 'CHEVROLET',
      'CHEYENNE': 'CHEVROLET', 'CHEYEN': 'CHEVROLET', 'LUV': 'CHEVROLET', 'GRAND BLAZER': 'CHEVROLET',
      'IMPALA': 'CHEVROLET', 'CENTURY': 'CHEVROLET', 'TAHOE': 'CHEVROLET', 'AVALANCHE': 'CHEVROLET',
      'MALIBU': 'CHEVROLET',
      // SUZUKI
      'GRAND VITARA': 'SUZUKI', 'VITARA': 'SUZUKI', 'SWIFT': 'SUZUKI',
      'ESTEEM': 'SUZUKI', 'JIMNY': 'SUZUKI', 'XL5': 'SUZUKI', 'XL7': 'SUZUKI',
      'WAGON R': 'SUZUKI', 'SUPER CARRY': 'SUZUKI',
      // FORD
      'FIESTA': 'FORD', 'FOCUS': 'FORD', 'ESCORT': 'FORD', 'EXPLORER': 'FORD',
      'RANGER': 'FORD', 'F-150': 'FORD', 'F150': 'FORD', 'F-250': 'FORD',
      'F250': 'FORD', 'F-350': 'FORD', 'F350': 'FORD', 'MUSTANG': 'FORD',
      'TAURUS': 'FORD', 'ECOSPORT': 'FORD', 'FUSION': 'FORD',
      // TOYOTA
      'COROLLA': 'TOYOTA', 'HILUX': 'TOYOTA', 'FORTUNER': 'TOYOTA',
      'CAMRY': 'TOYOTA', 'YARIS': 'TOYOTA', 'TERIOS': 'TOYOTA',
      '4RUNNER': 'TOYOTA', 'RUNNER': 'TOYOTA', 'LAND CRUISER': 'TOYOTA',
      'PRADO': 'TOYOTA', 'RAV4': 'TOYOTA', 'TACOMA': 'TOYOTA',
      'TUNDRA': 'TOYOTA', 'SIENNA': 'TOYOTA', 'STARLET': 'TOYOTA',
      'MERU': 'TOYOTA',
      // JEEP
      'GRAND CHEROKEE': 'JEEP', 'CHEROKEE': 'JEEP', 'WRANGLER': 'JEEP',
      'LIBERTY': 'JEEP', 'PATRIOT': 'JEEP', 'COMPASS': 'JEEP',
      // DODGE
      'RAM': 'DODGE', 'NEON': 'DODGE', 'STRATUS': 'DODGE',
      'CARAVAN': 'DODGE', 'DURANGO': 'DODGE', 'DAKOTA': 'DODGE',
      'JOURNEY': 'DODGE', 'ASPEN': 'DODGE',
      // RENAULT
      'LOGAN': 'RENAULT', 'SANDERO': 'RENAULT', 'DUSTER': 'RENAULT',
      'KANGOO': 'RENAULT', 'CLIO': 'RENAULT', 'MEGANE': 'RENAULT',
      // HYUNDAI
      'ELANTRA': 'HYUNDAI', 'ACCENT': 'HYUNDAI', 'TUCSON': 'HYUNDAI',
      'SANTA FE': 'HYUNDAI', 'SONATA': 'HYUNDAI', 'GETZ': 'HYUNDAI',
      'MATRIX': 'HYUNDAI', 'H1': 'HYUNDAI',
      // MITSUBISHI
      'LANCER': 'MITSUBISHI', 'MONTERO': 'MITSUBISHI', 'L200': 'MITSUBISHI',
      'OUTLANDER': 'MITSUBISHI', 'ECLIPSE': 'MITSUBISHI', 'GALANT': 'MITSUBISHI',
      // KIA
      'OPTIMA': 'KIA', 'RIO': 'KIA', 'SPORTAGE': 'KIA', 'SORENTO': 'KIA',
      'CERATO': 'KIA', 'PICANTO': 'KIA',
      // HONDA
      'CIVIC': 'HONDA', 'ACCORD': 'HONDA', 'CRV': 'HONDA', 'CR-V': 'HONDA',
      // VOLKSWAGEN
      'GOL': 'VOLKSWAGEN', 'JETTA': 'VOLKSWAGEN', 'PASSAT': 'VOLKSWAGEN',
      'GOLF': 'VOLKSWAGEN', 'POLO': 'VOLKSWAGEN', 'SAVEIRO': 'VOLKSWAGEN',
      'AMAROK': 'VOLKSWAGEN',
      // FIAT
      'UNO': 'FIAT', 'PALIO': 'FIAT', 'SIENA': 'FIAT', 'IDEA': 'FIAT',
      'STRADA': 'FIAT',
      // CHERY
      'ORINOCO': 'CHERY',
      // NISSAN
      'SENTRA': 'NISSAN', 'ALTIMA': 'NISSAN', 'XTRAIL': 'NISSAN',
      'X-TRAIL': 'NISSAN', 'FRONTIER': 'NISSAN', 'PATHFINDER': 'NISSAN',
      'VERSA': 'NISSAN', 'TIIDA': 'NISSAN', 'NAVARA': 'NISSAN',
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

  function extraerMarcaDeModelo(texto, dictionaryModelo) {
    // Second fallback: the text may mention a model ("SILVERADO", "GRAND
    // VITARA") without the brand word itself. Model keys can be one or
    // two words, so match with word boundaries instead of splitting on
    // whitespace. Longest keys first, so "GRAND VITARA" wins over any
    // shorter key that might also appear inside it.
    const limpio = String(texto || '').toUpperCase();
    const claves = Object.keys(dictionaryModelo).sort((a, b) => b.length - a.length);
    for (let i = 0; i < claves.length; i++) {
      const clave = claves[i];
      const escapada = clave.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const patron = new RegExp('(^|[^A-ZÁÉÍÓÚÑ0-9])' + escapada + '($|[^A-ZÁÉÍÓÚÑ0-9])');
      if (patron.test(limpio)) return dictionaryModelo[clave];
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
      const marcaExtraida = extraerMarcaDeTexto(rawItem.repuesto, dict.marca)
        || extraerMarcaDeModelo(rawItem.repuesto, dict.modelo);
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

  window.App.dictionaries = { getAll, addSynonym, normalizeTerm, normalizeItem, extraerMarcaDeTexto, extraerMarcaDeModelo };
})();
