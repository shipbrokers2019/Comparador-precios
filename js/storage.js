(function () {
  const PREFIX = 'cp_';
  const KEYS = {
    LISTAS: 'listas',
    DICCIONARIOS: 'diccionarios',
    PROVEEDORES: 'proveedores',
    TASAS: 'tasas',
    LAST_SYNC: 'lastSync',
  };

  function get(key, defaultValue) {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return defaultValue;
    try {
      return JSON.parse(raw);
    } catch (e) {
      return defaultValue;
    }
  }

  function set(key, value) {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  }

  window.App.storage = { get, set, KEYS };
})();
