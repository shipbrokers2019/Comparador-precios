// Deployed separately as a Google Apps Script Web App. See deployment
// instructions below — this file is not loaded by index.html directly.

var FOLDER_NAME = 'LISTAS A EVALUAR';
var HEADER_ALIASES = {
  marca: ['marca', 'make'],
  repuesto: ['repuesto', 'descripcion', 'descripción', 'item', 'producto'],
  precio: ['precio', 'price', 'valor'],
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
      var nombreProveedor = file.getName().replace(/\.(xlsx|csv|xls)$/i, '');
      var filas = leerArchivoComoFilas(file);
      resultado.push({ proveedor: nombreProveedor, filas: filas });
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
