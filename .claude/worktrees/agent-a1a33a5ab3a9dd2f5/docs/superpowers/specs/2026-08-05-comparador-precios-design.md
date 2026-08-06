# Comparador de Precios de Repuestos — Diseño

Fecha: 2026-08-05

## Objetivo

App HTML de una sola página (`index.html`), sin servidor propio, para uso interno en celulares, que permite leer listas de precios de repuestos de distintos proveedores (Excel/CSV en Google Drive), normalizar sus datos, calcular el precio final aplicando tasas de cambio y descuentos por proveedor, filtrarlos por repuesto/marca, y exportar el resultado comparativo a Excel.

## Restricción resuelta: consistencia entre celulares vs. "sin internet"

El pedido original pide dos cosas en tensión: conexión automática a Google Drive, y funcionamiento sin servidor ni internet. Como además se requiere que todos los celulares vean **la misma información**, se optó por: la app funciona offline con el último dato cacheado, pero se sincroniza con una fuente centralizada cuando hay internet disponible (breve, no continuo).

## Arquitectura

- **Frontend**: `index.html` único, sin build, CSS/JS embebidos. Se usa SheetJS (CDN) para leer archivos Excel/CSV y para generar el `.xlsx` de exportación.
- **Backend de datos**: Google Apps Script Web App (gratuito), que lee los archivos de la carpeta "LISTAS A EVALUAR" en Google Drive y los expone como JSON vía una URL pública del Web App.
- **Sincronización**: al abrir la app, si hay internet, hace `fetch()` a la URL del Web App y sobrescribe `localStorage.listas`. Si no hay internet, usa el último dato cacheado y muestra la fecha de la última sincronización exitosa.
- **Configuración editable** (tasas de cambio del día, condiciones comerciales por proveedor, diccionarios de sinónimos) vive en `localStorage`, editable desde la propia UI. No depende de internet.

## Componentes y flujo de datos

1. **Sync Manager**
   - Intenta `fetch()` al Web App al cargar la app.
   - Éxito → parsea JSON (una entrada por archivo/proveedor), sobrescribe `localStorage.listas`, actualiza timestamp de sync.
   - Falla (sin internet o Apps Script caído) → usa `localStorage.listas` existente sin bloquear el uso, muestra aviso "Datos desde: [fecha]".

2. **Normalizador**
   - Diccionario de sinónimos de **marca**, editable en la app (ej. `{"CHE": "CHEVROLET", "CHEV": "CHEVROLET"}`).
   - Diccionario de sinónimos de **repuesto**, editable en la app (ej. `{"CONCHA BIELA": "CONCHAS DE BIELA"}`).
   - Prioriza coincidencia exacta sobre parcial. Si hay ambigüedad o no hay match, la fila queda con el texto original y se marca visualmente como "sin normalizar", para revisión manual — nunca se descarta ni se asume automáticamente.

3. **Motor de cálculo financiero**
   - Convierte cada precio usando la tasa correspondiente a la moneda de la lista (BCV $, BCV €, Binance), cargadas manualmente en un panel de tasas del día.
   - Aplica los descuentos definidos en la ficha de condiciones de ese proveedor (ej. 40% por pago en efectivo en $, +15% adicional si se paga antes de 30 días), según cómo el usuario configuró si son acumulativos o excluyentes.
   - Valida el monto mínimo de compra configurado por proveedor: si no se alcanza, se marca visualmente el ítem/proveedor como "no cumple mínimo" (no se oculta).
   - Si falta una tasa necesaria, la lista afectada se excluye del resultado con aviso explícito ("Falta tasa Binance para Proveedor X"), en vez de calcular con datos incompletos.

4. **Config por proveedor**
   - Ficha editable por proveedor: % descuento efectivo, % adicional pronto pago, días límite, monto mínimo, tasa que usa esa lista. Persiste en `localStorage`, reutilizable en próximas cargas del mismo proveedor.

5. **Buscador/Filtro**
   - Campo de texto libre (repuesto) + selector de marca, ambos operando sobre valores ya normalizados.
   - Resultado ordenado automáticamente por precio final ascendente.

6. **Exportador**
   - Genera `.xlsx` (SheetJS) del resultado filtrado actual, con columnas: Proveedor, Repuesto, Marca, Precio original, Tasa aplicada, Descuentos aplicados, Precio final, Cumple mínimo (sí/no).

## Manejo de errores y casos borde

- Fila con columnas faltantes o vacías → se marca "incompleta", se excluye del cálculo, se lista aparte para revisión manual.
- Apps Script no responde → la app sigue funcionando con cache local, sin bloquear.
- Tasa faltante → la lista afectada se excluye del resultado con aviso explícito, no se calcula con datos incompletos.
- Sinónimo ambiguo → se prioriza coincidencia exacta; si persiste la ambigüedad, queda sin normalizar y marcado para revisión.

## Testing

Sin infraestructura de build ni servidor, se usa un checklist de verificación manual cubriendo:
- Sync con y sin internet.
- Carga de una lista con datos sucios/incompletos.
- Cálculo con cada combinación de descuentos (efectivo solo, efectivo + pronto pago, ninguno).
- Validación de monto mínimo (cumple / no cumple).
- Filtro combinado por texto + marca.
- Exportación a Excel del resultado filtrado.

## Fuera de alcance (explícitamente)

- Conexión directa y automática a Drive sin ningún componente intermedio (se resuelve vía Apps Script).
- Tasas de cambio automáticas desde APIs externas (se cargan manualmente).
- Tests automatizados de JS (se cubre con checklist manual).
- Autenticación de usuarios — uso interno, sin login.
