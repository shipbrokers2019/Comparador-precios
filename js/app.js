(function () {
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = String(str == null ? '' : str);
    return div.innerHTML.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function formatMoney(numero) {
    return numero.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function setStatusPill(text, state) {
    const pill = document.getElementById('sync-status-pill');
    document.getElementById('sync-status').textContent = text;
    pill.classList.remove('is-ok', 'is-error', 'is-busy');
    if (state) pill.classList.add(state);
  }

  function renderProvidersPanel() {
    const panel = document.getElementById('panel-proveedores');
    const providers = App.providers.getAll();
    panel.innerHTML = '<h2>Proveedores</h2>' +
      '<div class="provider-list">' +
      providers.map((p) => `
        <div class="provider-row">
          <div>
            <span class="provider-name">${escapeHtml(p.nombre)}</span>
            <span class="provider-meta">Efectivo ${p.descuentoEfectivoPercent}% · Pronto pago ${p.descuentoProntoPagoPercent}% (${p.descuentosAcumulables ? 'acumulables' : 'excluyentes'}) · Mínimo $${p.montoMinimo} · Tasa ${escapeHtml(p.tasaTipo)}</span>
          </div>
          <button type="button" class="btn btn-sm btn-danger" data-borrar-proveedor="${escapeHtml(p.id)}">Borrar</button>
        </div>`).join('') +
      '</div>' +
      '<form id="form-proveedor" class="provider-form">' +
      '<label class="field-group"><span class="field-label">Proveedor</span><input class="field" name="nombre" placeholder="Nombre exacto del archivo" required></label>' +
      '<label class="field-group"><span class="field-label">% efectivo</span><input class="field" name="descuentoEfectivoPercent" type="number" value="0"></label>' +
      '<label class="field-group"><span class="field-label">% pronto pago</span><input class="field" name="descuentoProntoPagoPercent" type="number" value="0"></label>' +
      '<label class="field-group"><span class="field-label">Monto mínimo</span><input class="field" name="montoMinimo" type="number" value="300"></label>' +
      '<label class="field-group"><span class="field-label">Tasa</span><select class="field" name="tasaTipo"><option value="BCV_USD">BCV $</option><option value="BCV_EUR">BCV €</option><option value="BINANCE">Binance</option></select></label>' +
      '<label class="checkbox-field"><input name="descuentosAcumulables" type="checkbox"> Acumulables</label>' +
      '<button type="submit" class="btn btn-primary">Agregar proveedor</button>' +
      '</form>';

    document.getElementById('form-proveedor').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const fd = new FormData(ev.target);
      App.providers.upsert({
        nombre: fd.get('nombre').trim(),
        descuentoEfectivoPercent: Number(fd.get('descuentoEfectivoPercent')),
        descuentoProntoPagoPercent: Number(fd.get('descuentoProntoPagoPercent')),
        descuentosAcumulables: fd.get('descuentosAcumulables') === 'on',
        montoMinimo: Number(fd.get('montoMinimo')),
        tasaTipo: fd.get('tasaTipo'),
      });
      renderProvidersPanel();
      renderResults();
    });

    panel.querySelectorAll('[data-borrar-proveedor]').forEach((btn) => {
      btn.addEventListener('click', () => {
        App.providers.remove(btn.getAttribute('data-borrar-proveedor'));
        renderProvidersPanel();
        renderResults();
      });
    });
  }

  function renderRatesPanel() {
    const panel = document.getElementById('panel-tasas');
    const rates = App.rates.get();
    panel.innerHTML = `
      <h2>Tasas del día</h2>
      <div class="field-row">
        <label class="field-group"><span class="field-label">BCV $</span><input class="field" id="tasa-bcv-usd" type="number" step="0.01" placeholder="0.00" value="${rates.BCV_USD || ''}"></label>
        <label class="field-group"><span class="field-label">BCV €</span><input class="field" id="tasa-bcv-eur" type="number" step="0.01" placeholder="0.00" value="${rates.BCV_EUR || ''}"></label>
        <label class="field-group"><span class="field-label">Binance</span><input class="field" id="tasa-binance" type="number" step="0.01" placeholder="0.00" value="${rates.BINANCE || ''}"></label>
        <button class="btn btn-primary" id="btn-guardar-tasas">Guardar tasas</button>
      </div>
    `;
    document.getElementById('btn-guardar-tasas').addEventListener('click', () => {
      App.rates.set({
        BCV_USD: Number(document.getElementById('tasa-bcv-usd').value) || 0,
        BCV_EUR: Number(document.getElementById('tasa-bcv-eur').value) || 0,
        BINANCE: Number(document.getElementById('tasa-binance').value) || 0,
      });
      renderResults();
    });
  }

  function populateMarcaFilter() {
    const select = document.getElementById('filtro-marca');
    // Only list recognized vehicle brands (marcaNormalizada) — a parts
    // manufacturer brand like "TSA" or "TAKASHI" is not something anyone
    // filters by when looking for "repuestos de Toyota".
    const marcas = [...new Set(
      App.sync.getCachedItems().filter((i) => i.marcaNormalizada).map((i) => i.marca)
    )].sort();
    select.innerHTML = '<option value="">Todas las marcas</option>' +
      marcas.map((m) => `<option value="${escapeHtml(m)}">${escapeHtml(m)}</option>`).join('');
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
    const { resultados, proveedoresSinTasa } = App.search.filterAndCalculate(items, providers, rates, opciones);

    const tbody = document.getElementById('tbody-resultados');
    tbody.innerHTML = resultados.length === 0
      ? '<tr><td colspan="10" class="empty-state">Sin resultados. Sincronizá, cargá un proveedor, o ajustá el filtro.</td></tr>'
      : resultados.map((r) => `
      <tr class="${!r.cumpleMinimo ? 'no-cumple-minimo' : ''} ${!r.marcaNormalizada || !r.repuestoNormalizado ? 'sin-normalizar' : ''}">
        <td>${escapeHtml(r.proveedor)}</td><td>${escapeHtml(r.repuesto)}</td><td>${escapeHtml(r.marca)}</td>
        <td>${escapeHtml(r.marcaRepuesto)}</td>
        <td>$${formatMoney(r.precioOriginal)}</td><td>${escapeHtml(r.descuentosAplicados)}</td>
        <td>${r.tasaAplicada}</td><td>$${formatMoney(r.precioFinalUSD)}</td>
        <td>${formatMoney(r.precioFinalBs)}</td>
        <td><span class="badge ${r.cumpleMinimo ? 'badge-ok' : 'badge-warn'}">${r.cumpleMinimo ? 'Sí' : 'No'}</span></td>
      </tr>`).join('');

    const aviso = document.getElementById('aviso-tasas-faltantes');
    if (proveedoresSinTasa.length > 0) {
      aviso.textContent = 'Falta tasa para: ' + proveedoresSinTasa.join(', ');
      aviso.classList.add('is-visible');
    } else {
      aviso.textContent = '';
      aviso.classList.remove('is-visible');
    }

    App.app.ultimosResultados = resultados;
    renderReportPage(resultados, opciones, providers);
  }

  // Fixed color order requested by the user: 1st provider added = light
  // green, 2nd = light blue, 3rd = light orange, 4th = light purple.
  // Beyond that, more light colors are picked automatically in the same
  // spirit. Order follows App.providers.getAll() (the order they were
  // configured in), not the order they happen to appear in the results.
  const CANTIDAD_COLORES_PROVEEDOR = 8;
  function construirColoresPorProveedor(providers) {
    const mapa = {};
    providers.forEach((p, i) => {
      mapa[p.nombre.trim()] = 'provider-color-' + (i % CANTIDAD_COLORES_PROVEEDOR);
    });
    return mapa;
  }

  function renderReportPage(resultados, opciones, providers) {
    const textoLabel = opciones.texto.trim() ? opciones.texto.trim().toUpperCase() : 'Todos los repuestos';
    const marcaLabel = opciones.marca.trim() ? opciones.marca.trim() : 'Todas';
    document.getElementById('reporte-filtro').innerHTML =
      `<strong>${escapeHtml(textoLabel)}</strong><br>Marca: ${escapeHtml(marcaLabel)}`;

    const coloresPorProveedor = construirColoresPorProveedor(providers);
    const lista = document.getElementById('reporte-lista');
    lista.innerHTML = resultados.length === 0
      ? '<p class="empty-state">Sin resultados. Sincronizá, cargá un proveedor, o ajustá el filtro.</p>'
      : resultados.map((r) => `
      <div class="report-item ${coloresPorProveedor[r.proveedor.trim()] || 'provider-color-0'}">
        <div class="report-item-main">
          <span class="report-item-repuesto">${escapeHtml(r.repuesto)}</span>
          <span class="report-item-precio">$${formatMoney(r.precioFinalUSD)}</span>
        </div>
        <div class="report-item-meta">${escapeHtml(r.proveedor)} · Marca ${escapeHtml(r.marcaRepuesto) || 'sin identificar'}</div>
        <div class="report-item-bs">Bs ${formatMoney(r.precioFinalBs)}</div>
      </div>`).join('');
  }

  function switchPage(pageId) {
    document.querySelectorAll('.page').forEach((page) => {
      page.hidden = page.id !== pageId;
    });
    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.classList.toggle('is-active', btn.dataset.page === pageId);
    });
  }

  function init() {
    window.App.app = { ultimosResultados: [] };

    renderProvidersPanel();
    renderRatesPanel();
    populateMarcaFilter();
    setStatusPill(App.sync.getLastSyncLabel(), null);

    const inputWebAppUrl = document.getElementById('input-webapp-url');
    inputWebAppUrl.value = App.sync.getWebAppUrl() || '';
    document.getElementById('btn-guardar-url').addEventListener('click', () => {
      App.sync.setWebAppUrl(inputWebAppUrl.value.trim());
    });

    document.getElementById('btn-sync').addEventListener('click', ejecutarSync);

    ['filtro-texto', 'filtro-marca', 'chk-efectivo', 'chk-pronto-pago'].forEach((id) => {
      document.getElementById(id).addEventListener('input', renderResults);
    });

    document.querySelectorAll('.nav-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchPage(btn.dataset.page));
    });

    document.getElementById('btn-exportar').addEventListener('click', () => {
      App.export.toExcel(App.app.ultimosResultados, 'comparativa-precios.xlsx');
    });

    renderResults();

    // I3 fix: auto-sync on open, not just on button click (spec §17/§22).
    ejecutarSync();
  }

  function ejecutarSync() {
    setStatusPill('Sincronizando...', 'is-busy');
    App.sync.syncNow().then((result) => {
      if (result.ok) {
        setStatusPill(App.sync.getLastSyncLabel(), 'is-ok');
      } else {
        const detalle = result.error ? 'Error: ' + result.error : 'Sin conexión — ' + App.sync.getLastSyncLabel();
        setStatusPill(detalle, 'is-error');
      }
      populateMarcaFilter();
      renderResults();
    });
  }

  document.addEventListener('DOMContentLoaded', init);
})();
