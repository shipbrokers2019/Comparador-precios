# Comparador de Precios de Repuestos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone `index.html` mobile app (no server, no build step) that syncs price lists from Google Drive via a free Apps Script Web App, normalizes provider data, calculates final prices with exchange rates and discounts, lets the user filter by part/brand, and exports results to Excel.

**Architecture:** Plain HTML/CSS/JS split into small `<script>`-tag modules (no ES `import`/`export`, since the file is opened via `file://` on phones and module CORS rules would break). Each module attaches its public functions to a single global namespace object `App`. Data persists in `localStorage`. A separate Google Apps Script project (`google-apps-script/Code.gs`) reads the Drive folder and serves JSON; the app fetches it opportunistically and falls back to cache when offline.

**Tech Stack:** Vanilla JS (ES2017+), no framework. SheetJS (CDN, `xlsx.full.min.js`) used only for Excel export. Google Apps Script (free tier) as the sync backend.

## Global Constraints

- No server of our own, no npm/build step — everything runs by opening `index.html` directly in a mobile browser.
- Zero cost: only free Google services (Apps Script Web App, Drive) are used.
- No automated JS test framework (per design decision) — verification uses a zero-dependency `test.html` harness with `console.assert`-style checks rendered to the page.
- Money amounts are always in USD internally; exchange rates only produce an informational Bs figure, they never replace the USD comparison basis.
- Never silently drop or guess bad data — unmatched/incomplete rows are flagged and shown, not hidden.

---

## File Structure

```
index.html                        # shell, loads css + all js modules in order
test.html                         # zero-dependency assertion harness
css/styles.css                    # mobile-first styles
js/storage.js                     # localStorage helpers + defaults
js/dictionaries.js                # synonym dictionaries + normalizer
js/providers.js                   # provider config CRUD
js/rates.js                       # exchange rate panel state
js/calculator.js                  # final price calculation engine
js/sync.js                        # Apps Script fetch + offline fallback
js/search.js                      # filter + sort
js/export.js                      # Excel export via SheetJS
js/app.js                         # DOM wiring / orchestration
google-apps-script/Code.gs        # Drive-reading backend (deployed separately)
```

---

### Task 1: Project scaffolding (`index.html`, `css/styles.css`, `test.html`)

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `test.html`

**Interfaces:**
- Produces: the global `window.App = {}` namespace object every later module attaches to. Produces the `<div id="results"></div>`, `<div id="sync-status"></div>` DOM containers later tasks render into.

- [ ] **Step 1: Create `index.html` shell**

```html
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Comparador de Precios de Repuestos</title>
<link rel="stylesheet" href="css/styles.css">
</head>
<body>
  <header>
    <h1>Comparador de Precios</h1>
    <div id="sync-status">Sin sincronizar</div>
    <button id="btn-sync">Sincronizar</button>
  </header>

  <section id="panel-tasas"></section>
  <section id="panel-proveedores"></section>

  <section id="panel-busqueda">
    <input type="text" id="filtro-texto" placeholder="Buscar repuesto...">
    <select id="filtro-marca"><option value="">Todas las marcas</option></select>
    <label><input type="checkbox" id="chk-efectivo"> Descuento efectivo</label>
    <label><input type="checkbox" id="chk-pronto-pago"> Pronto pago</label>
  </section>

  <section id="panel-resultados">
    <table id="tabla-resultados">
      <thead>
        <tr>
          <th>Proveedor</th><th>Repuesto</th><th>Marca</th>
          <th>Precio orig.</th><th>Descuentos</th><th>Tasa</th>
          <th>Precio final</th><th>Mínimo</th>
        </tr>
      </thead>
      <tbody id="tbody-resultados"></tbody>
    </table>
    <button id="btn-exportar">Exportar a Excel</button>
  </section>

  <script src="https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"></script>
  <script>window.App = {};</script>
  <script src="js/storage.js"></script>
  <script src="js/dictionaries.js"></script>
  <script src="js/providers.js"></script>
  <script src="js/rates.js"></script>
  <script src="js/calculator.js"></script>
  <script src="js/sync.js"></script>
  <script src="js/search.js"></script>
  <script src="js/export.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Create `css/styles.css`**

```css
* { box-sizing: border-box; }
body { font-family: system-ui, sans-serif; margin: 0; padding: 0.75rem; }
header { display: flex; flex-wrap: wrap; align-items: center; gap: 0.5rem; margin-bottom: 1rem; }
table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
th, td { border: 1px solid #ccc; padding: 0.35rem; text-align: left; }
tr.no-cumple-minimo { background: #fff3cd; }
tr.sin-normalizar { background: #f8d7da; }
#sync-status { font-size: 0.8rem; color: #555; }
```

- [ ] **Step 3: Create `test.html` harness**

```html
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Tests</title></head>
<body>
<h1>Resultados de pruebas</h1>
<ul id="test-results"></ul>
<script>window.App = {};</script>
<script src="js/storage.js"></script>
<script src="js/dictionaries.js"></script>
<script src="js/providers.js"></script>
<script src="js/rates.js"></script>
<script src="js/calculator.js"></script>
<script src="js/sync.js"></script>
<script src="js/search.js"></script>
<script>
window.assertions = [];
function assertEqual(actual, expected, label) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  window.assertions.push({ label, pass, actual, expected });
}
function renderAssertions() {
  const ul = document.getElementById('test-results');
  let failCount = 0;
  window.assertions.forEach(a => {
    const li = document.createElement('li');
    li.textContent = (a.pass ? 'PASS ' : 'FAIL ') + a.label +
      (a.pass ? '' : ` (esperado ${JSON.stringify(a.expected)}, obtuvo ${JSON.stringify(a.actual)})`);
    li.style.color = a.pass ? 'green' : 'red';
    ul.appendChild(li);
    if (!a.pass) failCount++;
  });
  const summary = document.createElement('li');
  summary.textContent = `${window.assertions.length - failCount}/${window.assertions.length} pruebas OK`;
  summary.style.fontWeight = 'bold';
  ul.prepend(summary);
}
</script>
</body>
</html>
```

- [ ] **Step 4: Verify scaffolding loads**

Open `index.html` directly in a browser (double-click or drag into a browser tab). Expected: page renders header "Comparador de Precios", no console errors (SheetJS + empty modules load fine even before later tasks add content — the `<script src="js/...">` tags will 404 until Task 2+ create those files, so for this step only, temporarily comment out the not-yet-created `js/*.js` script tags, confirm the page renders, then uncomment them — they'll be created in the next tasks).

- [ ] **Step 5: Commit**

```bash
git add index.html css/styles.css test.html
git commit -m "feat: scaffold index.html shell, styles, and test harness"
```

---

### Task 2: Storage helper (`js/storage.js`)

**Files:**
- Create: `js/storage.js`

**Interfaces:**
- Consumes: `window.App` (from Task 1).
- Produces: `App.storage.get(key, defaultValue)`, `App.storage.set(key, value)`, and the key constants `App.storage.KEYS = { LISTAS, DICCIONARIOS, PROVEEDORES, TASAS, LAST_SYNC }`.

- [ ] **Step 1: Add assertions to `test.html`**

Insert before `renderAssertions()` in the `<script>` block of `test.html`:

```html
<script>
App.storage.set(App.storage.KEYS.TASAS, { BCV_USD: 40 });
assertEqual(App.storage.get(App.storage.KEYS.TASAS, {}), { BCV_USD: 40 }, 'storage.set/get round-trip');
assertEqual(App.storage.get('clave_inexistente', 'default'), 'default', 'storage.get default value');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Open `test.html` in a browser. Expected: console error `App.storage is undefined` (module doesn't exist yet).

- [ ] **Step 3: Write `js/storage.js`**

```js
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
```

- [ ] **Step 4: Run test.html to verify it passes**

Open `test.html` in a browser. Expected: "2/2 pruebas OK" (list items green).

- [ ] **Step 5: Commit**

```bash
git add js/storage.js test.html
git commit -m "feat: add localStorage helper module"
```

---

### Task 3: Dictionaries & normalizer (`js/dictionaries.js`)

**Files:**
- Create: `js/dictionaries.js`

**Interfaces:**
- Consumes: `App.storage.get/set`, `App.storage.KEYS.DICCIONARIOS`.
- Produces:
  - `App.dictionaries.getAll()` → `{ marca: {...}, repuesto: {...} }`
  - `App.dictionaries.addSynonym(tipo, alias, valorCanonico)` where `tipo` is `'marca'` or `'repuesto'`
  - `App.dictionaries.normalizeTerm(term, dictionary)` → `{ value: string, matched: boolean }`
  - `App.dictionaries.normalizeItem(rawItem)` → `{ ...rawItem, marca, marcaNormalizada, repuesto, repuestoNormalizado }` where `rawItem` is `{ proveedor, marca, repuesto, precio }`

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
App.dictionaries.addSynonym('marca', 'CHE', 'CHEVROLET');
App.dictionaries.addSynonym('marca', 'CHEV', 'CHEVROLET');
assertEqual(
  App.dictionaries.normalizeTerm('che', App.dictionaries.getAll().marca),
  { value: 'CHEVROLET', matched: true },
  'normalizeTerm matches case-insensitive exact alias'
);
assertEqual(
  App.dictionaries.normalizeTerm('TOYOTA', App.dictionaries.getAll().marca),
  { value: 'TOYOTA', matched: false },
  'normalizeTerm returns original + matched:false when no alias found'
);
const item = App.dictionaries.normalizeItem({ proveedor: 'ACME', marca: 'CHE', repuesto: 'PISTON', precio: 10 });
assertEqual(item.marca, 'CHEVROLET', 'normalizeItem normalizes marca');
assertEqual(item.marcaNormalizada, true, 'normalizeItem flags marca as normalized');
assertEqual(item.repuestoNormalizado, false, 'normalizeItem flags unmatched repuesto');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.dictionaries is undefined`.

- [ ] **Step 3: Write `js/dictionaries.js`**

```js
(function () {
  const DEFAULTS = {
    marca: {
      'CHE': 'CHEVROLET', 'CHEV': 'CHEVROLET', 'CHEVROLET': 'CHEVROLET',
      'FORD': 'FORD',
      'TOY': 'TOYOTA', 'TOYOTA': 'TOYOTA',
    },
    repuesto: {
      'CONCHA BIELA': 'CONCHAS DE BIELA', 'CONCHAS DE BIELA': 'CONCHAS DE BIELA',
      'CONCHA BANCADA': 'CONCHAS DE BANCADA', 'CONCHAS DE BANCADA': 'CONCHAS DE BANCADA',
      'AXIAL': 'AXIALES', 'AXIALES': 'AXIALES',
      'PISTON': 'PISTONES', 'PISTONES': 'PISTONES',
      'CIGUENAL': 'CIGUENALES', 'CIGUENALES': 'CIGUENALES',
    },
  };

  function getAll() {
    return App.storage.get(App.storage.KEYS.DICCIONARIOS, DEFAULTS);
  }

  function addSynonym(tipo, alias, valorCanonico) {
    const all = getAll();
    all[tipo][alias.trim().toUpperCase()] = valorCanonico.trim().toUpperCase();
    App.storage.set(App.storage.KEYS.DICCIONARIOS, all);
  }

  function normalizeTerm(term, dictionary) {
    const clean = String(term || '').trim().toUpperCase();
    if (dictionary[clean]) {
      return { value: dictionary[clean], matched: true };
    }
    const substringMatches = Object.keys(dictionary).filter(
      (key) => clean.includes(key) || key.includes(clean)
    );
    const distinctValues = [...new Set(substringMatches.map((k) => dictionary[k]))];
    if (distinctValues.length === 1) {
      return { value: distinctValues[0], matched: true };
    }
    return { value: clean, matched: false };
  }

  function normalizeItem(rawItem) {
    const dict = getAll();
    const marcaResult = normalizeTerm(rawItem.marca, dict.marca);
    const repuestoResult = normalizeTerm(rawItem.repuesto, dict.repuesto);
    return {
      ...rawItem,
      marca: marcaResult.value,
      marcaNormalizada: marcaResult.matched,
      repuesto: repuestoResult.value,
      repuestoNormalizado: repuestoResult.matched,
    };
  }

  window.App.dictionaries = { getAll, addSynonym, normalizeTerm, normalizeItem };
})();
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all listed assertions PASS (cumulative count grows with each task).

- [ ] **Step 5: Commit**

```bash
git add js/dictionaries.js test.html
git commit -m "feat: add synonym dictionaries and normalizer"
```

---

### Task 4: Provider config CRUD (`js/providers.js`)

**Files:**
- Create: `js/providers.js`

**Interfaces:**
- Consumes: `App.storage`.
- Produces:
  - `App.providers.getAll()` → array of `{ id, nombre, descuentoEfectivoPercent, descuentoProntoPagoPercent, diasProntoPago, descuentosAcumulables, montoMinimo, tasaTipo }`
  - `App.providers.upsert(provider)` (creates if `id` is falsy/new, else replaces by `id`)
  - `App.providers.remove(id)`
  - `App.providers.getById(id)`

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
const p1 = App.providers.upsert({
  nombre: 'ACME', descuentoEfectivoPercent: 40, descuentoProntoPagoPercent: 15,
  diasProntoPago: 30, descuentosAcumulables: true, montoMinimo: 300, tasaTipo: 'BCV_USD',
});
assertEqual(App.providers.getAll().length, 1, 'providers.upsert creates a new provider');
assertEqual(App.providers.getById(p1.id).nombre, 'ACME', 'providers.getById finds provider');
App.providers.upsert({ ...p1, nombre: 'ACME RENAMED' });
assertEqual(App.providers.getAll().length, 1, 'providers.upsert updates instead of duplicating');
assertEqual(App.providers.getById(p1.id).nombre, 'ACME RENAMED', 'providers.upsert applies the update');
App.providers.remove(p1.id);
assertEqual(App.providers.getAll().length, 0, 'providers.remove deletes provider');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.providers is undefined`.

- [ ] **Step 3: Write `js/providers.js`**

```js
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
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add js/providers.js test.html
git commit -m "feat: add provider config CRUD module"
```

---

### Task 5: Rates panel (`js/rates.js`)

**Files:**
- Create: `js/rates.js`

**Interfaces:**
- Consumes: `App.storage`.
- Produces:
  - `App.rates.get()` → `{ BCV_USD: number, BCV_EUR: number, BINANCE: number, updatedAt: string|null }`
  - `App.rates.set({ BCV_USD, BCV_EUR, BINANCE })` (stamps `updatedAt` with `new Date().toISOString()`)

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
assertEqual(App.rates.get().BCV_USD, undefined, 'rates.get returns empty object before first set');
App.rates.set({ BCV_USD: 40, BCV_EUR: 43, BINANCE: 39.5 });
const r = App.rates.get();
assertEqual(r.BCV_USD, 40, 'rates.set/get stores BCV_USD');
assertEqual(typeof r.updatedAt, 'string', 'rates.set stamps updatedAt');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.rates is undefined`.

- [ ] **Step 3: Write `js/rates.js`**

```js
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
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add js/rates.js test.html
git commit -m "feat: add exchange rates module"
```

---

### Task 6: Financial calculator (`js/calculator.js`)

**Files:**
- Create: `js/calculator.js`

**Interfaces:**
- Consumes: provider shape from `App.providers` (Task 4), rates shape from `App.rates` (Task 5).
- Produces: `App.calculator.calculateFinalPrice(precioOriginal, provider, rates, opciones)` → `{ precioOriginal, descuentosAplicados, precioFinalUSD, tasaAplicada, precioFinalBs, cumpleMinimo }` where `opciones` is `{ aplicarEfectivo: boolean, aplicarProntoPago: boolean }`.

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
const provider = {
  descuentoEfectivoPercent: 40, descuentoProntoPagoPercent: 15,
  descuentosAcumulables: true, montoMinimo: 300, tasaTipo: 'BCV_USD',
};
const rates = { BCV_USD: 40 };

const r1 = App.calculator.calculateFinalPrice(1000, provider, rates, { aplicarEfectivo: false, aplicarProntoPago: false });
assertEqual(r1.precioFinalUSD, 1000, 'calculator: no discounts leaves price unchanged');
assertEqual(r1.cumpleMinimo, true, 'calculator: 1000 >= minimo 300 cumple');
assertEqual(r1.descuentosAplicados, 'Ninguno', 'calculator: label is Ninguno with no discounts');

const r2 = App.calculator.calculateFinalPrice(1000, provider, rates, { aplicarEfectivo: true, aplicarProntoPago: false });
assertEqual(r2.precioFinalUSD, 600, 'calculator: 40% cash discount applied');

const r3 = App.calculator.calculateFinalPrice(1000, provider, rates, { aplicarEfectivo: true, aplicarProntoPago: true });
assertEqual(r3.precioFinalUSD, 510, 'calculator: cumulative 40% then 15% compounds to 510');
assertEqual(r3.tasaAplicada, 40, 'calculator: uses BCV_USD rate from provider.tasaTipo');
assertEqual(r3.precioFinalBs, 20400, 'calculator: precioFinalBs = precioFinalUSD * tasaAplicada');

const providerNoAcumula = { ...provider, descuentosAcumulables: false };
const r4 = App.calculator.calculateFinalPrice(1000, providerNoAcumula, rates, { aplicarEfectivo: true, aplicarProntoPago: true });
assertEqual(r4.precioFinalUSD, 600, 'calculator: non-cumulative discounts uses only the larger one');

const r5 = App.calculator.calculateFinalPrice(100, provider, rates, { aplicarEfectivo: false, aplicarProntoPago: false });
assertEqual(r5.cumpleMinimo, false, 'calculator: 100 < minimo 300 no cumple');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.calculator is undefined`.

- [ ] **Step 3: Write `js/calculator.js`**

```js
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
    const tasaAplicada = rates[provider.tasaTipo] || 0;
    const precioFinalBs = Math.round(precioFinalUSD * tasaAplicada * 100) / 100;
    const cumpleMinimo = precioOriginal >= (provider.montoMinimo || 0);

    return { precioOriginal, descuentosAplicados, precioFinalUSD, tasaAplicada, precioFinalBs, cumpleMinimo };
  }

  window.App.calculator = { calculateFinalPrice };
})();
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS, including the compounding math (`1000 * 0.6 * 0.85 = 510`).

- [ ] **Step 5: Commit**

```bash
git add js/calculator.js test.html
git commit -m "feat: add financial calculator with cumulative/exclusive discounts"
```

---

### Task 7: Google Apps Script backend (`google-apps-script/Code.gs`)

**Files:**
- Create: `google-apps-script/Code.gs`

**Interfaces:**
- Produces: an HTTP GET endpoint (once deployed as a Web App) returning JSON:
  `[{ "proveedor": "ACME", "filas": [{ "marca": "CHE", "repuesto": "PISTON", "precio": 10.5 }, ...] }, ...]`
  This is the exact shape `js/sync.js` (Task 8) consumes.

- [ ] **Step 1: Write `google-apps-script/Code.gs`**

```javascript
// Deployed separately as a Google Apps Script Web App. See deployment
// instructions below — this file is not loaded by index.html directly.

var FOLDER_NAME = 'LISTAS A EVALUAR';
var HEADER_ALIASES = {
  marca: ['marca', 'make'],
  repuesto: ['repuesto', 'descripcion', 'descripción', 'item', 'producto'],
  precio: ['precio', 'price', 'valor'],
};

function doGet(e) {
  var folder = DriveApp.getFoldersByName(FOLDER_NAME).next();
  var files = folder.getFiles();
  var resultado = [];

  while (files.hasNext()) {
    var file = files.next();
    var nombreProveedor = file.getName().replace(/\.(xlsx|csv|xls)$/i, '');
    var filas = leerArchivoComoFilas(file);
    resultado.push({ proveedor: nombreProveedor, filas: filas });
  }

  return ContentService
    .createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

function leerArchivoComoFilas(file) {
  var mimeType = file.getMimeType();
  var spreadsheetId;
  var esTemporal = false;

  if (mimeType === MimeType.GOOGLE_SHEETS) {
    spreadsheetId = file.getId();
  } else {
    // xlsx/xls/csv: convert to a temporary Google Sheet to read its values.
    var blob = file.getBlob();
    var resource = { title: file.getName() + '_temp', mimeType: MimeType.GOOGLE_SHEETS };
    var converted = Drive.Files.insert(resource, blob, { convert: true });
    spreadsheetId = converted.id;
    esTemporal = true;
  }

  var sheet = SpreadsheetApp.openById(spreadsheetId).getSheets()[0];
  var values = sheet.getDataRange().getValues();

  if (esTemporal) {
    Drive.Files.remove(spreadsheetId);
  }

  return filasDesdeValores(values);
}

function filasDesdeValores(values) {
  if (values.length === 0) return [];

  var headerRow = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var columnas = detectarColumnas(headerRow);
  var startRow = columnas.encontradasPorNombre ? 1 : 0;

  var filas = [];
  for (var i = startRow; i < values.length; i++) {
    var fila = values[i];
    var marca = fila[columnas.marca];
    var repuesto = fila[columnas.repuesto];
    var precio = fila[columnas.precio];
    if (marca === '' && repuesto === '' && precio === '') continue;
    filas.push({
      marca: String(marca || ''),
      repuesto: String(repuesto || ''),
      precio: Number(precio) || 0,
    });
  }
  return filas;
}

function detectarColumnas(headerRow) {
  var indices = { marca: -1, repuesto: -1, precio: -1 };
  Object.keys(HEADER_ALIASES).forEach(function (campo) {
    HEADER_ALIASES[campo].forEach(function (alias) {
      var idx = headerRow.indexOf(alias);
      if (idx !== -1 && indices[campo] === -1) indices[campo] = idx;
    });
  });

  var encontradasPorNombre = indices.marca !== -1 && indices.repuesto !== -1 && indices.precio !== -1;
  if (!encontradasPorNombre) {
    // Fallback: assume column order marca, repuesto, precio.
    indices = { marca: 0, repuesto: 1, precio: 2 };
  }
  return { marca: indices.marca, repuesto: indices.repuesto, precio: indices.precio, encontradasPorNombre: encontradasPorNombre };
}
```

- [ ] **Step 2: Deploy the script (manual, one-time setup)**

1. Go to https://script.google.com, create a new project, paste the contents of `google-apps-script/Code.gs` into `Code.gs`.
2. In the left sidebar, click **Servicios** (Services) → add **Drive API** (Advanced Drive Service) → enable it. This is required for the xlsx→Sheets conversion.
3. In the Google Cloud project linked to the script (Project Settings → Google Cloud Platform project), enable the **Google Drive API** if prompted.
4. Click **Deploy → New deployment → Web app**. Set "Execute as: Me", "Who has access: Anyone with the link" (internal use, no login prompt). Deploy.
5. Copy the generated Web App URL (ends in `/exec`) — this is the value `js/sync.js` (Task 8) will call.
6. Make sure the folder "LISTAS A EVALUAR" exists in the Drive account of whoever deployed the script, and that it contains the provider Excel/CSV files.

- [ ] **Step 3: Manual verification**

Open the deployed Web App URL directly in a browser. Expected: a JSON array response like `[{"proveedor":"ACME","filas":[{"marca":"CHE","repuesto":"PISTON","precio":10.5}]}]`. If the folder is empty, expect `[]`.

- [ ] **Step 4: Commit**

```bash
git add google-apps-script/Code.gs
git commit -m "feat: add Apps Script backend to read Drive price lists as JSON"
```

---

### Task 8: Sync manager (`js/sync.js`)

**Files:**
- Create: `js/sync.js`

**Interfaces:**
- Consumes: `App.storage`, `App.dictionaries.normalizeItem` (Task 3), the JSON shape produced by Task 7's Web App (`[{ proveedor, filas: [{ marca, repuesto, precio }] }]`).
- Produces:
  - `App.sync.setWebAppUrl(url)` / `App.sync.getWebAppUrl()`
  - `App.sync.syncNow()` → `Promise<{ ok: boolean, itemCount: number, error?: string }>`. On success, stores flattened+normalized items under `App.storage.KEYS.LISTAS` and updates `App.storage.KEYS.LAST_SYNC`. On failure, leaves existing cached `LISTAS` untouched and resolves `{ ok: false, error }` instead of rejecting (callers should never need a `.catch`).
  - `App.sync.getCachedItems()` → array of normalized items, each `{ proveedor, marca, marcaNormalizada, repuesto, repuestoNormalizado, precio }`.
  - `App.sync.getLastSyncLabel()` → human-readable string, e.g. `"Datos desde: 05/08/2026, 14:32"` or `"Sin sincronizar"`.

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
// Stub fetch to avoid a real network call in the test harness.
window.fetch = function (url) {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve([
      { proveedor: 'ACME', filas: [{ marca: 'CHE', repuesto: 'PISTON', precio: 100 }] },
    ]),
  });
};

App.sync.setWebAppUrl('https://example.com/exec');
App.sync.syncNow().then(function (result) {
  assertEqual(result.ok, true, 'sync.syncNow resolves ok:true on successful fetch');
  assertEqual(result.itemCount, 1, 'sync.syncNow reports the flattened item count');
  const items = App.sync.getCachedItems();
  assertEqual(items.length, 1, 'sync.getCachedItems returns the stored items');
  assertEqual(items[0].marca, 'CHEVROLET', 'sync.getCachedItems items are normalized');
  assertEqual(items[0].proveedor, 'ACME', 'sync.getCachedItems keeps proveedor name');

  // Now simulate offline: fetch rejects, cache must survive untouched.
  window.fetch = function () { return Promise.reject(new Error('offline')); };
  App.sync.syncNow().then(function (offlineResult) {
    assertEqual(offlineResult.ok, false, 'sync.syncNow resolves ok:false when fetch fails');
    assertEqual(App.sync.getCachedItems().length, 1, 'sync.syncNow keeps old cache on failure');
    renderAssertions();
  });
});
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.sync is undefined`. (Note: because this task's assertions are async, temporarily remove/comment the earlier synchronous `renderAssertions()` calls from Tasks 2–6 so only this task's final `renderAssertions()` runs — or leave them; multiple calls simply re-render cumulatively, which is fine since each call re-reads the full `window.assertions` array.)

- [ ] **Step 3: Write `js/sync.js`**

```js
(function () {
  const URL_KEY = 'webAppUrl';

  function setWebAppUrl(url) {
    App.storage.set(URL_KEY, url);
  }

  function getWebAppUrl() {
    return App.storage.get(URL_KEY, '');
  }

  function flattenAndNormalize(payload) {
    const items = [];
    payload.forEach((proveedorBloque) => {
      proveedorBloque.filas.forEach((fila) => {
        items.push(
          App.dictionaries.normalizeItem({
            proveedor: proveedorBloque.proveedor,
            marca: fila.marca,
            repuesto: fila.repuesto,
            precio: fila.precio,
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
      .then((res) => res.json())
      .then((payload) => {
        const items = flattenAndNormalize(payload);
        App.storage.set(App.storage.KEYS.LISTAS, items);
        App.storage.set(App.storage.KEYS.LAST_SYNC, new Date().toISOString());
        return { ok: true, itemCount: items.length };
      })
      .catch((err) => ({ ok: false, error: err.message }));
  }

  function getCachedItems() {
    return App.storage.get(App.storage.KEYS.LISTAS, []);
  }

  function getLastSyncLabel() {
    const last = App.storage.get(App.storage.KEYS.LAST_SYNC, null);
    if (!last) return 'Sin sincronizar';
    const d = new Date(last);
    return 'Datos desde: ' + d.toLocaleString('es-VE');
  }

  window.App.sync = { setWebAppUrl, getWebAppUrl, syncNow, getCachedItems, getLastSyncLabel };
})();
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS, including the offline-fallback cache-preservation check.

- [ ] **Step 5: Commit**

```bash
git add js/sync.js test.html
git commit -m "feat: add sync manager with offline cache fallback"
```

---

### Task 9: Search/filter (`js/search.js`)

**Files:**
- Create: `js/search.js`

**Interfaces:**
- Consumes: normalized item shape from Task 8 (`{ proveedor, marca, repuesto, precio, ... }`), `App.providers.getById` (Task 4), `App.calculator.calculateFinalPrice` (Task 6), `App.rates.get` (Task 5).
- Produces: `App.search.filterAndCalculate(items, providers, rates, { texto, marca, aplicarEfectivo, aplicarProntoPago })` → array of `{ ...item, ...calculoFinal }` sorted ascending by `precioFinalUSD`. Items whose provider has no matching config (`App.providers.getById` returns `null` because the provider name from Drive doesn't match a configured provider id) are skipped — provider matching is done by `proveedor` name equality against `provider.nombre`, not by id, since sync data only carries the name.

- [ ] **Step 1: Add assertions to `test.html`**

```html
<script>
const items = [
  { proveedor: 'ACME', marca: 'CHEVROLET', repuesto: 'PISTONES', precio: 1000 },
  { proveedor: 'ACME', marca: 'FORD', repuesto: 'AXIALES', precio: 200 },
  { proveedor: 'OTRO', marca: 'CHEVROLET', repuesto: 'PISTONES', precio: 50 },
];
const providersList = [
  { id: 'p1', nombre: 'ACME', descuentoEfectivoPercent: 40, descuentoProntoPagoPercent: 0, descuentosAcumulables: false, montoMinimo: 300, tasaTipo: 'BCV_USD' },
];
const ratesObj = { BCV_USD: 40 };

const resultado = App.search.filterAndCalculate(items, providersList, ratesObj, {
  texto: 'piston', marca: '', aplicarEfectivo: true, aplicarProntoPago: false,
});
assertEqual(resultado.length, 1, 'search.filterAndCalculate: text filter matches PISTONES, excludes AXIALES, excludes unmatched provider OTRO');
assertEqual(resultado[0].precioFinalUSD, 600, 'search.filterAndCalculate applies calculator discount to filtered item');

const resultadoMarca = App.search.filterAndCalculate(items, providersList, ratesObj, {
  texto: '', marca: 'FORD', aplicarEfectivo: false, aplicarProntoPago: false,
});
assertEqual(resultadoMarca.length, 1, 'search.filterAndCalculate: marca filter matches only FORD item');

const resultadoOrden = App.search.filterAndCalculate(
  [
    { proveedor: 'ACME', marca: 'CHEVROLET', repuesto: 'PISTONES', precio: 1000 },
    { proveedor: 'ACME', marca: 'CHEVROLET', repuesto: 'PISTONES', precio: 100 },
  ],
  providersList, ratesObj, { texto: '', marca: '', aplicarEfectivo: false, aplicarProntoPago: false }
);
assertEqual(resultadoOrden[0].precioFinalUSD, 100, 'search.filterAndCalculate sorts ascending by precioFinalUSD');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.search is undefined`.

- [ ] **Step 3: Write `js/search.js`**

```js
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
    filtrados.forEach((item) => {
      const provider = providersList.find((p) => p.nombre === item.proveedor);
      if (!provider) return;
      const calculo = App.calculator.calculateFinalPrice(item.precio, provider, rates, {
        aplicarEfectivo: opciones.aplicarEfectivo,
        aplicarProntoPago: opciones.aplicarProntoPago,
      });
      conCalculo.push({ ...item, ...calculo });
    });

    conCalculo.sort((a, b) => a.precioFinalUSD - b.precioFinalUSD);
    return conCalculo;
  }

  window.App.search = { filterAndCalculate };
})();
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add js/search.js test.html
git commit -m "feat: add search/filter module with sorted final-price results"
```

---

### Task 10: Excel export (`js/export.js`)

**Files:**
- Create: `js/export.js`

**Interfaces:**
- Consumes: the result shape from Task 9 (`{ proveedor, repuesto, marca, precioOriginal, descuentosAplicados, tasaAplicada, precioFinalUSD, cumpleMinimo }`), the global `XLSX` object (from the CDN script tag in `index.html`, Task 1).
- Produces: `App.export.toExcel(resultados, filename)` — triggers a browser download of an `.xlsx` file. No return value needed by callers.

- [ ] **Step 1: Add assertions to `test.html`**

Excel generation triggers a real file download, which isn't meaningfully assertable in a headless-less browser harness. Instead, verify the row-mapping function in isolation (`App.export.buildRows`, an internal helper exposed for testability):

```html
<script>
const filas = App.export.buildRows([
  { proveedor: 'ACME', repuesto: 'PISTONES', marca: 'CHEVROLET', precioOriginal: 1000, descuentosAplicados: 'Efectivo 40%', tasaAplicada: 40, precioFinalUSD: 600, cumpleMinimo: true },
]);
assertEqual(filas[0], {
  Proveedor: 'ACME', Repuesto: 'PISTONES', Marca: 'CHEVROLET',
  'Precio original': 1000, Descuentos: 'Efectivo 40%', 'Tasa aplicada': 40,
  'Precio final': 600, 'Cumple mínimo': 'Sí',
}, 'export.buildRows maps a result row to the expected Excel column shape');
renderAssertions();
</script>
```

- [ ] **Step 2: Run test.html to verify it fails**

Expected: `App.export is undefined`.

- [ ] **Step 3: Write `js/export.js`**

```js
(function () {
  function buildRows(resultados) {
    return resultados.map((r) => ({
      Proveedor: r.proveedor,
      Repuesto: r.repuesto,
      Marca: r.marca,
      'Precio original': r.precioOriginal,
      Descuentos: r.descuentosAplicados,
      'Tasa aplicada': r.tasaAplicada,
      'Precio final': r.precioFinalUSD,
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
```

- [ ] **Step 4: Run test.html to verify it passes**

Expected: all assertions PASS.

- [ ] **Step 5: Commit**

```bash
git add js/export.js test.html
git commit -m "feat: add Excel export module"
```

---

### Task 11: App wiring (`js/app.js`) and full integration checklist

**Files:**
- Create: `js/app.js`
- Modify: `index.html:` no structural change expected, only confirm the `<script src="js/app.js">` tag from Task 1 is last.

**Interfaces:**
- Consumes: every module produced in Tasks 2–10 (`App.storage`, `App.dictionaries`, `App.providers`, `App.rates`, `App.calculator`, `App.sync`, `App.search`, `App.export`) plus the DOM ids defined in Task 1's `index.html` (`#btn-sync`, `#sync-status`, `#filtro-texto`, `#filtro-marca`, `#chk-efectivo`, `#chk-pronto-pago`, `#tbody-resultados`, `#btn-exportar`, `#panel-tasas`, `#panel-proveedores`).
- Produces: no further public API — this is the top-level orchestrator, nothing else depends on it.

- [ ] **Step 1: Write `js/app.js`**

```js
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
```

- [ ] **Step 2: Add `js/app.js` script tag placement check**

Confirm in `index.html` (Task 1) that `<script src="js/app.js"></script>` is the last script tag, after all other modules and after the SheetJS CDN tag. If Task 1's file didn't already include it, add it now.

- [ ] **Step 3: Full manual integration checklist**

Open `index.html` in a browser and walk through:

1. **Sync with configured URL**: in devtools console, run `App.sync.setWebAppUrl('<deployed Apps Script /exec URL>')`, reload, click "Sincronizar". Expected: status updates to "Datos desde: ..." and the marca dropdown populates.
2. **Sync without internet**: turn off wifi/data, click "Sincronizar" again. Expected: status shows "Sin conexión — Datos desde: [previous timestamp]", table still shows previously synced rows (cache untouched).
3. **Dirty/incomplete data**: manually edit a row in the source Drive file to leave "precio" blank, re-sync. Expected: that row's precio becomes `0` and it's visibly distinguishable in the results (flows through calculator as `precioOriginal: 0`, will show `cumpleMinimo: false`) rather than crashing the page.
4. **Discount combinations**: toggle "Descuento efectivo" and "Pronto pago" checkboxes independently and together for a provider configured with `descuentosAcumulables: true` vs `false`. Expected: prices in the table update live and match the compounding/exclusive rule from Task 6.
5. **Minimum purchase validation**: find or create a row priced below a provider's `montoMinimo`. Expected: its table row is highlighted (`no-cumple-minimo` class, light yellow background) and the "Mínimo" column shows "No".
6. **Combined filter**: type a repuesto keyword AND pick a marca. Expected: only rows matching both narrow down, sorted ascending by "Precio final".
7. **Export**: click "Exportar a Excel". Expected: an `.xlsx` file downloads; opening it shows the same rows/columns as the on-screen table.

- [ ] **Step 4: Run `test.html` one final time**

Open `test.html`. Expected: every assertion from Tasks 2–10 shows PASS, with the summary line showing the full count (e.g. "24/24 pruebas OK") and zero red FAIL entries.

- [ ] **Step 5: Commit**

```bash
git add js/app.js index.html
git commit -m "feat: wire up UI orchestration and complete integration"
```

---

## Self-Review Notes

- **Spec coverage:** Drive reading → Task 7 (Apps Script). Normalization → Task 3. Rates/discounts/minimum → Tasks 5, 6. Search UI → Task 9 + Task 11 wiring. Excel export → Task 10. Offline-first sync → Task 8. All design-doc sections have a corresponding task.
- **Placeholder scan:** no TBD/TODO left; every step has runnable code or an exact manual procedure with expected output.
- **Type consistency:** `calculateFinalPrice` signature (`precioOriginal, provider, rates, opciones`) is used identically in Task 6's own tests, Task 9 (`search.js`), and Task 11 (`app.js`). The normalized item shape (`marca`, `marcaNormalizada`, `repuesto`, `repuestoNormalizado`, `precio`, `proveedor`) is produced once in Task 3/8 and consumed unchanged in Tasks 9 and 11.
