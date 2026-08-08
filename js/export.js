(function () {
  function buildRows(resultados) {
    return resultados.map((r) => ({
      Proveedor: r.proveedor,
      Repuesto: r.repuesto,
      Marca: r.marca,
      'Marca repuesto': r.marcaRepuesto,
      'Precio original': r.precioOriginal,
      Descuentos: r.descuentosAplicados,
      'Tasa aplicada': r.tasaAplicada,
      'Precio final': r.precioFinalUSD,
      'Precio final (Bs)': r.precioFinalBs,
      'Cumple mínimo': r.cumpleMinimo ? 'Sí' : 'No',
    }));
  }

  function toExcel(resultados, filename) {
    const rows = buildRows(resultados);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Comparativa');
    XLSX.writeFile(workbook, filename || 'comparativa-precios.xlsx');
  }

  window.App.export = { buildRows, toExcel };
})();
