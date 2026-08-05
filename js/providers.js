(function () {
  function getAll() {
    return App.storage.get(App.storage.KEYS.PROVEEDORES, []);
  }

  function saveAll(list) {
    App.storage.set(App.storage.KEYS.PROVEEDORES, list);
  }

  function getById(id) {
    return getAll().find((p) => p.id === id) || null;
  }

  function upsert(provider) {
    const list = getAll();
    if (!provider.id) {
      provider.id = 'prov_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
      list.push(provider);
    } else {
      const idx = list.findIndex((p) => p.id === provider.id);
      if (idx === -1) list.push(provider);
      else list[idx] = provider;
    }
    saveAll(list);
    return provider;
  }

  function remove(id) {
    saveAll(getAll().filter((p) => p.id !== id));
  }

  window.App.providers = { getAll, getById, upsert, remove };
})();
