(function () {
  function get() {
    return App.storage.get(App.storage.KEYS.TASAS, {});
  }

  function set(rates) {
    const value = { ...rates, updatedAt: new Date().toISOString() };
    App.storage.set(App.storage.KEYS.TASAS, value);
    return value;
  }

  window.App.rates = { get, set };
})();
