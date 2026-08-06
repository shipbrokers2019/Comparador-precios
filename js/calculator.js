(function () {
  function calculateFinalPrice(precioOriginal, provider, rates, opciones) {
    const pctEfectivo = opciones.aplicarEfectivo ? (provider.descuentoEfectivoPercent || 0) : 0;
    const pctProntoPago = opciones.aplicarProntoPago ? (provider.descuentoProntoPagoPercent || 0) : 0;

    let precioFinalUSD = precioOriginal;
    let descuentosAplicados = 'Ninguno';
    const partes = [];

    if (pctEfectivo > 0 && pctProntoPago > 0 && provider.descuentosAcumulables) {
      precioFinalUSD = precioOriginal * (1 - pctEfectivo / 100) * (1 - pctProntoPago / 100);
      partes.push(`Efectivo ${pctEfectivo}%`, `Pronto pago ${pctProntoPago}%`);
    } else if (pctEfectivo > 0 || pctProntoPago > 0) {
      const pctMayor = Math.max(pctEfectivo, pctProntoPago);
      precioFinalUSD = precioOriginal * (1 - pctMayor / 100);
      partes.push(pctMayor === pctEfectivo ? `Efectivo ${pctEfectivo}%` : `Pronto pago ${pctProntoPago}%`);
    }
    if (partes.length > 0) descuentosAplicados = partes.join(' + ');

    precioFinalUSD = Math.round(precioFinalUSD * 100) / 100;
    const tasaFaltante = !rates[provider.tasaTipo];
    const tasaAplicada = rates[provider.tasaTipo] || 0;
    const precioFinalBs = Math.round(precioFinalUSD * tasaAplicada * 100) / 100;
    const cumpleMinimo = precioOriginal >= (provider.montoMinimo || 0);

    return { precioOriginal, descuentosAplicados, precioFinalUSD, tasaAplicada, precioFinalBs, cumpleMinimo, tasaFaltante };
  }

  window.App.calculator = { calculateFinalPrice };
})();
