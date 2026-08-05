(function () {
  function renderProvidersPanel() {
    const panel = document.getElementById('panel-proveedores');
    const providers = App.providers.getAll();
    panel.innerHTML = '<h2>Proveedores</h2>' + providers.map((p) => `
      <div>
        <strong>${p.nombre}</strong>
        — Efectivo ${p.descuentoEfectivoPercent}% / Pronto pago ${p.descuentoProntoPagoPercent}%
        (${p.descuentosAcumulables ? 'acumulables' : 'excluyentes'})
        — Mínimo $${p.montoMinimo} — Tasa: ${p.tasaTipo}
      </div>`).join('') +
      '<form id="form-proveedor">' +
      '<input name="nombre" placeholder="Proveedor" required>' +
      '<input name="descuentoEfectivoPercent" type="number" placeholder="% efectivo" value="0">' +
      '<input name="descuentoProntoPagoPercent" type="number" placeholder="% pronto pago" value="0">' +
      '<label><input name="descuentosAcumulables" type="checkbox"> Acumulables</label>' +
      '<input name="montoMinimo" type="number" placeholder="Monto mínimo" value="300">' +
      '<select name="tasaTipo"><option value="BCV_USD">BCV $</option><option value="BCV_EUR">BCV €</option><option value="BINANCE">Binance</option></select>' +
      '<button type="submit">Agregar proveedor</button>' +
      '</form>';

    document.getElementById('form-proveedor').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      App.providers.upsert({
        nombre: fd.get('nombre'),
        descuentoEfectivoPercent: Number(fd.get('descuentoEfectivoPercent')),
        descuentoProntoPagoPercent: Number(fd.get('descuentoProntoPagoPercent')),
        descuentosAcumulables: fd.get('descuentosAcumulables') === 'on',
        montoMinimo: Number(fd.get('montoMinimo')),
        tasaTipo: fd.get('tasaTipo'),
      });
      renderProvidersPanel();
    });
  }

  function renderRatesPanel() {
    const panel = document.getElementById('panel-tasas');
    const rates = App.rates.get();
    panel.innerHTML = `
      <h2>Tasas del día</h2>
      <label>BCV $ <input id="tasa-bcv-usd" type="number" step="0.01" value="${rates.BCV_USD || ''}"></label>
      <label>BCV € <input id="tasa-bcv-eur" type="number" step="0.01" value="${rates.BCV_EUR || ''}"></label>
      <label>Binance <input id="tasa-binance" type="number" step="0.01" value="${rates.BINANCE || ''}"></label>
      <button id="btn-guardar-tasas">Guardar tasas</button>
    `;
    document.getElementById('btn-guardar-tasas').addEventListener('click', () => {
      App.rates.set({
        BCV_USD: Number(document.getElementById('tasa-bcv-usd').value) || 0,
        BCV_EUR: Number(document.getElementById('tasa-bcv-eur').value) || 0,
        BINANCE: Number(document.getElementById('tasa-binance').value) || 0,
      });
    });
  }

  function populateMarcaFilter() {
    const select = document.getElementById('filtro-marca');
    const marcas = [...new Set(App.sync.getCachedItems().map((i) => i.marca))].sort();
    select.innerHTML = '<option value="">Todas las marcas</option>' +
      marcas.map((m) => `<option value="${m}">${m}</option>`).join('');
  }

  function renderResults() {
    const items = App.sync.getCachedItems();
    const providers = App.providers.getAll();
    const rates = App.rates.get();
    const opciones = {
      texto: document.getElementById('filtro-texto').value,
      marca: document.getElementById('filtro-marca').value,
      aplicarEfectivo: document.getElementById('chk-efectivo').checked,
      aplicarProntoPago: document.getElementById('chk-pronto-pago').checked,
    };
    const resultados = App.search.filterAndCalculate(items, providers, rates, opciones);

    const tbody = document.getElementById('tbody-resultados');
    tbody.innerHTML = resultados.map((r) => `
      <tr class="${!r.cumpleMinimo ? 'no-cumple-minimo' : ''} ${!r.marcaNormalizada || !r.repuestoNormalizado ? 'sin-normalizar' : ''}">
        <td>${r.proveedor}</td><td>${r.repuesto}</td><td>${r.marca}</td>
        <td>$${r.precioOriginal.toFixed(2)}</td><td>${r.descuentosAplicados}</td>
        <td>${r.tasaAplicada}</td><td>$${r.precioFinalUSD.toFixed(2)}</td>
        <td>${r.cumpleMinimo ? 'Sí' : 'No'}</td>
      </tr>`).join('');

    App.app.ultimosResultados = resultados;
  }

  function init() {
    window.App.app = { ultimosResultados: [] };

    renderProvidersPanel();
    renderRatesPanel();
    populateMarcaFilter();
    document.getElementById('sync-status').textContent = App.sync.getLastSyncLabel();

    document.getElementById('btn-sync').addEventListener('click', () => {
      document.getElementById('sync-status').textContent = 'Sincronizando...';
      App.sync.syncNow().then((result) => {
        document.getElementById('sync-status').textContent = result.ok
          ? App.sync.getLastSyncLabel()
          : 'Sin conexión — ' + App.sync.getLastSyncLabel();
        populateMarcaFilter();
        renderResults();
      });
    });

    ['filtro-texto', 'filtro-marca', 'chk-efectivo', 'chk-pronto-pago'].forEach((id) => {
      document.getElementById(id).addEventListener('input', renderResults);
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
      App.export.toExcel(App.app.ultimosResultados, 'comparativa-precios.xlsx');
    });

    renderResults();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
