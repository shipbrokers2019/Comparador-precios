// Deployed separately as a Google Apps Script Web App. See deployment
// instructions below — this file is not loaded by index.html directly.

var FOLDER_NAME = 'LISTAS A EVALUAR';
var HEADER_ALIASES = {
  marca: ['marca', 'make', 'vehiculo', 'vehículo'],
  repuesto: ['repuesto', 'descripcion', 'descripción', 'nombre', 'producto'],
  precio: ['precio', 'price', 'valor', 'pvp'],
};

function doGet(e) {
  try {
    var folders = DriveApp.getFoldersByName(FOLDER_NAME);
    if (!folders.hasNext()) {
      throw new Error('No se encontró la carpeta "LISTAS A EVALUAR" en Drive');
    }
    var folder = folders.next();
    var files = folder.getFiles();
    var resultado = [];

    while (files.hasNext()) {
      var file = files.next();
      var nombreProveedor = file.getName().replace(/\.(xlsx|csv|xls)$/i, '').trim();
      // A single bad file (weird format, conversion failure) must not take
      // down the whole sync for every other provider — catch per file and
      // report the error inline instead of letting it bubble up.
      try {
        var filas = leerArchivoComoFilas(file);
        resultado.push({ proveedor: nombreProveedor, filas: filas });
      } catch (fileErr) {
        resultado.push({ proveedor: nombreProveedor, filas: [], error: fileErr.message });
      }
    }

    return ContentService
      .createTextOutput(JSON.stringify(resultado))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService
      .createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
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
    // I7: targets Drive API v3 (the default when enabling "Drive API" as an
    // Advanced Service in a new Apps Script project). v3 renamed Files.insert
    // to Files.create and dropped the separate {convert:true} option — setting
    // resource.mimeType to MimeType.GOOGLE_SHEETS is what triggers conversion.
    var resource = { name: file.getName() + '_temp', mimeType: MimeType.GOOGLE_SHEETS };
    var converted = Drive.Files.create(resource, blob);
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

  // Multi-table sheets (one sub-section per "Departamento", each with its
  // own repeated header row) can use a different column layout per
  // section. Re-detect the header every time a header-like row is found,
  // instead of locking onto whichever one appears first in the file.
  var columnas = null;
  var filas = [];

  for (var i = 0; i < values.length; i++) {
    var fila = values[i];
    var headerRow = fila.map(function (h) { return String(h).trim().toLowerCase(); });
    var candidato = detectarColumnas(headerRow);
    if (candidato.encontradasPorNombre) {
      columnas = candidato;
      continue; // this row is a header, not a data row
    }

    if (!columnas) continue; // no header found yet: skip title/logo rows

    var marca = columnas.marca !== -1 ? fila[columnas.marca] : '';
    var repuesto = fila[columnas.repuesto];
    var precio = fila[columnas.precio];
    // Skip rows with no usable price: section titles and blank separator
    // rows between sections never carry a real numeric price, so this is
    // a reliable way to drop them without guessing at layout.
    if (precio === '' || precio === null || precio === undefined || isNaN(Number(precio))) continue;
    // Skip rows with an implausible price (data-entry errors in the
    // source file, e.g. a stray extra zero turning $54.57 into
    // $54,569,999,999,999.99). No auto part legitimately costs this much.
    var PRECIO_MAXIMO_RAZONABLE = 50000;
    if (Number(precio) > PRECIO_MAXIMO_RAZONABLE) continue;
    filas.push({
      marca: String(marca || ''),
      repuesto: String(repuesto || ''),
      precio: Number(precio) || 0,
    });
  }

  if (!columnas) {
    // Never found any recognizable header anywhere in the file: fall back
    // to treating every row as data, in column order marca/repuesto/precio.
    filas = [];
    for (var j = 0; j < values.length; j++) {
      var fallbackFila = values[j];
      var fallbackPrecio = fallbackFila[2];
      if (fallbackPrecio === '' || fallbackPrecio === null || fallbackPrecio === undefined || isNaN(Number(fallbackPrecio))) continue;
      filas.push({
        marca: String(fallbackFila[0] || ''),
        repuesto: String(fallbackFila[1] || ''),
        precio: Number(fallbackPrecio) || 0,
      });
    }
  }

  return filas;
}

// Real column headers are short words ("Código", "Descripción", "Precio2
// $"). Title rows and company names are long sentences that can
// accidentally contain a header word (e.g. "REPUESTOS Y FILTROS
// VENEZOLANOS C.A" contains "repuesto"). Ignoring long cells when matching
// avoids mistaking a title row for the real header row.
var LARGO_MAXIMO_ENCABEZADO = 30;

function detectarColumnas(headerRow) {
  var indices = { marca: -1, repuesto: -1, precio: -1 };
  Object.keys(HEADER_ALIASES).forEach(function (campo) {
    HEADER_ALIASES[campo].forEach(function (alias) {
      for (var i = 0; i < headerRow.length; i++) {
        // Substring match: a header cell like "precio pvp" should still
        // count as the "precio" column, not just an exact "precio" cell.
        if (
          indices[campo] === -1 &&
          headerRow[i].length <= LARGO_MAXIMO_ENCABEZADO &&
          headerRow[i].indexOf(alias) !== -1
        ) {
          indices[campo] = i;
        }
      }
    });
  });

  // Extra safety: repuesto and precio must be different columns. If a
  // single cell matched both (another symptom of a title row slipping
  // through), this row cannot be a real header.
  if (indices.repuesto !== -1 && indices.repuesto === indices.precio) {
    indices.repuesto = -1;
    indices.precio = -1;
  }

  // Marca is optional: some real supplier files have no vehicle-brand
  // column at all (just código/descripción/precio). Requiring it would
  // force those files into the wrong-columns positional fallback instead
  // of correctly reading their real repuesto/precio columns.
  var encontradasPorNombre = indices.repuesto !== -1 && indices.precio !== -1;
  return { marca: indices.marca, repuesto: indices.repuesto, precio: indices.precio, encontradasPorNombre: encontradasPorNombre };
}
