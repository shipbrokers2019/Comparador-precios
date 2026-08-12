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
    const palabrasBusqueda = String(texto || '').trim().toUpperCase().split(/\s+/).filter(Boolean)
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
  // matches an item's own code, or matches a code in the same
  // equivalencias group as the item's code (different providers often use
  // different OEM/reference numbers for the same physical part), it's a
  // match — independent of whatever the text-based repuesto match found.
  function coincideCodigo(texto, itemCodigo, equivalencias) {
    const busqueda = String(texto || '').trim().toUpperCase();
    if (!busqueda || !itemCodigo) return false;
    if (itemCodigo === busqueda) return true;
    const grupo = equivalencias[busqueda];
    return !!grupo && grupo.codigos.indexOf(itemCodigo) !== -1;
  }

  function filterAndCalculate(items, providersList, rates, opciones, equivalencias) {
    const marca = (opciones.marca || '').trim().toUpperCase();
    const equivalenciasSeguras = equivalencias || {};

    const filtrados = items.filter((item) => {
      const coincideTexto = coincideTextoParcial(opciones.texto, item.repuesto) ||
        coincideCodigo(opciones.texto, item.codigo, equivalenciasSeguras);
      const coincideMarca = !marca || item.marca.toUpperCase() === marca;
      return coincideTexto && coincideMarca;
    });

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
      const grupoInfo = item.codigo ? equivalenciasSeguras[item.codigo] : null;
      const codigosEquivalentes = grupoInfo ? grupoInfo.codigos : (item.codigo ? [item.codigo] : []);
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
