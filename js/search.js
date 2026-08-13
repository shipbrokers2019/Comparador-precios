(function () {
  // Real descriptions across providers spell things inconsistently
  // (singular/plural, abbreviated words: "CONCHA" vs "CONCHAS", "PIST" vs
  // "PISTON"). Match word-by-word instead of the whole phrase, and treat
  // either word as a valid prefix of the other so "concha" finds
  // "conchas" and "conchas" finds "concha".
  // Grammatical connector words. Requiring these to literally appear in
  // the description breaks searches like "concha de bancada" — most
  // descriptions never spell out "de", so it's dropped from the search
  // terms instead of being treated as a required word.
  const PALABRAS_CONECTORAS = new Set(['DE', 'DEL', 'LA', 'LAS', 'EL', 'LOS', 'Y', 'CON', 'PARA', 'SIN', 'A']);

  function coincideTextoParcial(texto, repuesto) {
    // Split on any non-alphanumeric char (not just whitespace) so a dashed
    // code like "M662A-050" becomes two words ["M662A","050"] — same
    // tokenization as the repuesto text below. Splitting only on
    // whitespace treated "M662A-050" as one token that happened to start
    // with "M662A", matching every size variant (STD/075/100) instead of
    // just the 050 the user actually typed.
    const palabrasBusqueda = String(texto || '').trim().toUpperCase().split(/[^A-ZÁÉÍÓÚÑ0-9]+/).filter(Boolean)
      .filter((palabra) => !PALABRAS_CONECTORAS.has(palabra));
    if (palabrasBusqueda.length === 0) return true;
    const palabrasRepuesto = String(repuesto || '').toUpperCase().split(/[^A-ZÁÉÍÓÚÑ0-9]+/).filter(Boolean);
    // The "search word starts with repuesto word" direction only counts
    // when the repuesto word is at least 4 letters — otherwise short
    // connector words in the description ("CON", "DE", "LA") would
    // falsely match almost any search term that happens to start with
    // them (e.g. "conchas" starts with "con").
    const LARGO_MINIMO_PALABRA_CORTA = 4;
    return palabrasBusqueda.every((palabraBusqueda) =>
      palabrasRepuesto.some((palabraRepuesto) =>
        palabraRepuesto.startsWith(palabraBusqueda) ||
        (palabraRepuesto.length >= LARGO_MINIMO_PALABRA_CORTA && palabraBusqueda.startsWith(palabraRepuesto))
      )
    );
  }

  // The search box doubles as a code search: if the typed text exactly
  // matches an item's own code, it's a match — independent of whatever
  // the text-based repuesto match found. This is intentionally an exact
  // match only: expanding to the whole equivalencias group here would
  // also surface sibling size-variant rows of the same manufacturer code
  // (e.g. searching "M043A-075" pulling in "M043A-STD"/"M043A-050"),
  // which is not what a specific-code search should return. Cross-provider
  // equivalents ARE still added as full result cards, just via a separate
  // step (itemsEquivalentesOtrasMarcas below) that excludes same-provider
  // group members instead of blindly expanding the whole group here.
  function coincideCodigo(texto, itemCodigo) {
    const busqueda = String(texto || '').trim().toUpperCase();
    if (!busqueda || !itemCodigo) return false;
    return itemCodigo === busqueda;
  }

  // Extracts the trailing measure token from a code (STD, a 1-3 digit
  // thousandths code like "025"/"40", or an already-decimal code like
  // "0.25"/"1.00") and normalizes it to either 'STD' or a fixed two-decimal
  // string, so codes from different providers that spell the same measure
  // differently (e.g. "-025" vs "-0.25") compare equal.
  function medidaNormalizada(codigo) {
    const m = String(codigo || '').toUpperCase().match(/-((?:STD)|\d{1,3}|\d\.\d{1,2})$/);
    if (!m) return null;
    const token = m[1];
    if (token === 'STD') return 'STD';
    if (token.indexOf('.') !== -1) return parseFloat(token).toFixed(2);
    return (parseInt(token, 10) / 100).toFixed(2);
  }

  // When the search text is itself an exact code, also pull in that code's
  // cross-provider equivalents (different proveedor => different brand, in
  // practice) as full separate result cards — not just the informational
  // "Equivalencia OEM" tag — so the user can compare final price across
  // suppliers for the same physical part. Same-provider items in the same
  // group are excluded on purpose: a provider only lists its own brand's
  // rows, so a same-provider group member is a size variant of the
  // identical code (e.g. M043A-STD next to M043A-075), not a different
  // brand's equivalent part. Cross-provider candidates are further filtered
  // to the same measure as the searched code — otherwise a provider whose
  // group member also spans multiple measures (e.g. EBITEN's C-829735-010/
  // -050/-100/-STD all sharing one Grupo) would surface every one of its
  // own size variants as a separate card, instead of just the one that
  // actually matches the size the user searched for.
  function itemsEquivalentesOtrasMarcas(items, texto, equivalencias) {
    const busqueda = String(texto || '').trim().toUpperCase();
    if (!busqueda) return [];
    const medidaBuscada = medidaNormalizada(busqueda);
    const encontrados = [];
    items.forEach((item) => {
      if (item.codigo !== busqueda) return;
      const grupo = equivalencias[item.codigo];
      if (!grupo) return;
      items.forEach((candidato) => {
        if (candidato.proveedor === item.proveedor) return;
        if (grupo.codigos.indexOf(candidato.codigo) === -1) return;
        if (medidaBuscada && medidaNormalizada(candidato.codigo) !== medidaBuscada) return;
        encontrados.push(candidato);
      });
    });
    return encontrados;
  }

  function filterAndCalculate(items, providersList, rates, opciones, equivalencias) {
    const marca = (opciones.marca || '').trim().toUpperCase();
    const equivalenciasSeguras = equivalencias || {};

    const filtradosPorTexto = items.filter((item) => {
      const coincideTexto = coincideTextoParcial(opciones.texto, item.repuesto) ||
        coincideCodigo(opciones.texto, item.codigo);
      const coincideMarca = !marca || item.marca.toUpperCase() === marca;
      return coincideTexto && coincideMarca;
    });
    const equivalentesCruzados = itemsEquivalentesOtrasMarcas(items, opciones.texto, equivalenciasSeguras)
      .filter((item) => filtradosPorTexto.indexOf(item) === -1);
    const filtrados = filtradosPorTexto.concat(equivalentesCruzados);

    const conCalculo = [];
    const proveedoresSinTasa = new Set();
    filtrados.forEach((item) => {
      const provider = providersList.find((p) => (p.nombre || '').trim() === (item.proveedor || '').trim());
      if (!provider) return;
      const calculo = App.calculator.calculateFinalPrice(item.precio, provider, rates, {
        aplicarEfectivo: opciones.aplicarEfectivo,
        aplicarProntoPago: opciones.aplicarProntoPago,
      });
      if (calculo.tasaFaltante) {
        proveedoresSinTasa.add(item.proveedor);
        return;
      }
      // Every code in this item's equivalencias group (itself included),
      // plus the web-researched descripción/motor for that group when
      // available — so the UI can show all known equivalent OEM/reference
      // codes instead of just the one this particular provider happens to use.
      // Restricted to the item's own measure: a Grupo now holds every
      // measure variant from every provider (STD/010/020/... each as its
      // own row), so without this filter this list would dump every size
      // of every brand into one unreadable blob instead of just the sizes
      // that actually match the part in hand.
      const grupoInfo = item.codigo ? equivalenciasSeguras[item.codigo] : null;
      const medidaItem = item.codigo ? medidaNormalizada(item.codigo) : null;
      const codigosEquivalentes = grupoInfo
        ? (medidaItem ? grupoInfo.codigos.filter((c) => medidaNormalizada(c) === medidaItem) : grupoInfo.codigos)
        : (item.codigo ? [item.codigo] : []);
      conCalculo.push({
        ...item,
        ...calculo,
        codigosEquivalentes,
        descripcionWeb: grupoInfo ? grupoInfo.descripcion : '',
        motorCompletoWeb: grupoInfo ? grupoInfo.motorCompleto : '',
      });
    });

    conCalculo.sort((a, b) => a.proveedor.localeCompare(b.proveedor) || a.precioFinalUSD - b.precioFinalUSD);
    return { resultados: conCalculo, proveedoresSinTasa: [...proveedoresSinTasa] };
  }

  window.App.search = { filterAndCalculate };
})();
