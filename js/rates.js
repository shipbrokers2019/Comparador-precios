(function () {
  function get() {
    return App.storage.get(App.storage.KEYS.TASAS, {});
  }

  function set(rates) {
    const value = { ...rates, updatedAt: new Date().toISOString() };
    App.storage.set(App.storage.KEYS.TASAS, value);
    return value;
  }

  // Fetches BCV (official) and an approximate Binance P2P rate through the
  // Apps Script backend (it can reach those sites without the browser's
  // CORS restrictions). Never writes to storage itself — the caller
  // decides what to do with the fetched numbers, so the user can review
  // them before they overwrite anything.
  function fetchExternas() {
    const url = App.sync.getWebAppUrl();
    if (!url) return Promise.resolve({ ok: false, error: 'No hay URL de Apps Script configurada' });
    const separador = url.indexOf('?') === -1 ? '?' : '&';
    return fetch(url + separador + 'accion=tasas')
      .then((res) => res.json())
      .then((data) => ({ ok: true, data }))
      .catch((err) => ({ ok: false, error: err.message }));
  }

  window.App.rates = { get, set, fetchExternas };
})();
