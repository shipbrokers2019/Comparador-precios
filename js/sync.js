(function () {
  const URL_KEY = 'webAppUrl';

  function setWebAppUrl(url) {
    App.storage.set(URL_KEY, url);
  }

  function getWebAppUrl() {
    return App.storage.get(URL_KEY, '');
  }

  function flattenAndNormalize(proveedores) {
    const items = [];
    proveedores.forEach((proveedorBloque) => {
      proveedorBloque.filas.forEach((fila) => {
        items.push(
          App.dictionaries.normalizeItem({
            proveedor: proveedorBloque.proveedor,
            marca: fila.marca,
            repuesto: fila.repuesto,
            precio: fila.precio,
            codigo: fila.codigo,
          })
        );
      });
    });
    return items;
  }

  function syncNow() {
    const url = getWebAppUrl();
    if (!url) return Promise.resolve({ ok: false, error: 'No hay URL de Apps Script configurada' });

    return fetch(url)
      .then((res) => {
        if (!res.ok) return { ok: false, error: 'Error HTTP ' + res.status };
        return res.json().then((payload) => {
          if (payload && payload.error) {
            return { ok: false, error: payload.error };
          }
          const items = flattenAndNormalize(payload.proveedores || []);
          App.storage.set(App.storage.KEYS.LISTAS, items);
          App.storage.set(App.storage.KEYS.EQUIVALENCIAS, payload.equivalencias || {});
          App.storage.set(App.storage.KEYS.LAST_SYNC, new Date().toISOString());
          return { ok: true, itemCount: items.length };
        });
      })
      .catch((err) => ({ ok: false, error: err.message }));
  }

  function getCachedItems() {
    return App.storage.get(App.storage.KEYS.LISTAS, []);
  }

  function getCachedEquivalencias() {
    return App.storage.get(App.storage.KEYS.EQUIVALENCIAS, {});
  }

  function getLastSyncLabel() {
    const last = App.storage.get(App.storage.KEYS.LAST_SYNC, null);
    if (!last) return 'Sin sincronizar';
    const d = new Date(last);
    return 'Datos desde: ' + d.toLocaleString('es-VE');
  }

  window.App.sync = { setWebAppUrl, getWebAppUrl, syncNow, getCachedItems, getCachedEquivalencias, getLastSyncLabel };
})();
