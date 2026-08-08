(function () {
  // Real descriptions across providers spell things inconsistently
  // (singular/plural, abbreviated words: "CONCHA" vs "CONCHAS", "PIST" vs
  // "PISTON"). Match word-by-word instead of the whole phrase, and treat
  // either word as a valid prefix of the other so "concha" finds
  // "conchas" and "conchas" finds "concha".
  function coincideTextoParcial(texto, repuesto) {
    const palabrasBusqueda = String(texto || '').trim().toUpperCase().split(/\s+/).filter(Boolean);
    if (palabrasBusqueda.length === 0) return true;
    const palabrasRepuesto = String(repuesto || '').toUpperCase().split(/[^A-ZÁÉÍÓÚÑ0-9]+/).filter(Boolean);
    return palabrasBusqueda.every((palabraBusqueda) =>
      palabrasRepuesto.some((palabraRepuesto) =>
        palabraRepuesto.startsWith(palabraBusqueda) || palabraBusqueda.startsWith(palabraRepuesto)
      )
    );
  }

  function filterAndCalculate(items, providersList, rates, opciones) {
    const marca = (opciones.marca || '').trim().toUpperCase();

    const filtrados = items.filter((item) => {
      const coincideTexto = coincideTextoParcial(opciones.texto, item.repuesto);
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
      conCalculo.push({ ...item, ...calculo });
    });

    conCalculo.sort((a, b) => a.proveedor.localeCompare(b.proveedor) || a.precioFinalUSD - b.precioFinalUSD);
    return { resultados: conCalculo, proveedoresSinTasa: [...proveedoresSinTasa] };
  }

  window.App.search = { filterAndCalculate };
})();
