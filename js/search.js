(function () {
  function filterAndCalculate(items, providersList, rates, opciones) {
    const texto = (opciones.texto || '').trim().toUpperCase();
    const marca = (opciones.marca || '').trim().toUpperCase();

    const filtrados = items.filter((item) => {
      const coincideTexto = !texto || item.repuesto.toUpperCase().includes(texto);
      const coincideMarca = !marca || item.marca.toUpperCase() === marca;
      return coincideTexto && coincideMarca;
    });

    const conCalculo = [];
    const proveedoresSinTasa = new Set();
    filtrados.forEach((item) => {
      const provider = providersList.find((p) => p.nombre === item.proveedor);
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

    conCalculo.sort((a, b) => a.precioFinalUSD - b.precioFinalUSD);
    return { resultados: conCalculo, proveedoresSinTasa: [...proveedoresSinTasa] };
  }

  window.App.search = { filterAndCalculate };
})();
