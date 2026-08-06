# Comparador de Precios de Repuestos

App para comparar precios de repuestos entre varios proveedores, aplicando descuentos y tasas de cambio, sin necesidad de servidor propio.

## 1. Desplegar el Web App de Google Apps Script (`google-apps-script/Code.gs`)

Esto es lo que le da a la app acceso a las listas de precios guardadas en Google Drive.

1. Ir a [script.google.com](https://script.google.com) e iniciar sesión con la cuenta de Google que tendrá acceso a la carpeta de Drive.
2. Crear un **Proyecto nuevo**.
3. Borrar el contenido del archivo `Code.gs` que aparece por defecto y pegar todo el contenido de `google-apps-script/Code.gs` de este repositorio.
4. Habilitar el servicio avanzado de Drive:
   - En el panel izquierdo, hacer clic en **Servicios** (el ícono `+`).
   - Buscar **Drive API** y agregarlo.
5. Guardar el proyecto (`Ctrl+S` o el ícono de guardar). Ponerle un nombre, por ejemplo "Comparador Precios API".
6. Desplegar como Web App:
   - Botón **Implementar** (Deploy) → **Nueva implementación** (New deployment).
   - Tipo: **Aplicación web** (Web app).
   - **Ejecutar como:** Yo (tu cuenta).
   - **Quién tiene acceso:** Cualquiera con el enlace.
   - Hacer clic en **Implementar** y autorizar los permisos que pida Google.
7. Copiar la URL que termina en `/exec`. Esa es la URL que la app va a usar para sincronizar.

> Si en el futuro se modifica `Code.gs`, hay que hacer **Implementar → Gestionar implementaciones → editar (lápiz) → Nueva versión → Implementar** para que los cambios tomen efecto en la URL `/exec` ya existente.

## 2. Preparar la carpeta de Drive

- La carpeta debe llamarse exactamente: **`LISTAS A EVALUAR`**.
- Dentro de esa carpeta va un archivo por proveedor (Excel `.xlsx`, `.xls` o `.csv`). El **nombre del archivo** (sin extensión) se usa como nombre del proveedor.
- Cada archivo debe tener una fila de encabezado con estas columnas (el orden no importa si los encabezados coinciden con alguno de estos alias, sin distinguir mayúsculas/minúsculas):

| Campo    | Encabezados reconocidos                         |
|----------|--------------------------------------------------|
| Marca    | `marca`, `make`                                   |
| Repuesto | `repuesto`, `descripcion`, `descripción`, `item`, `producto` |
| Precio   | `precio`, `price`, `valor`                        |

- Si el archivo no tiene encabezados reconocibles, la app asume que las tres primeras columnas son, en orden, Marca / Repuesto / Precio.

## 3. Conectar la app con el Web App

1. Abrir `index.html` en el navegador.
2. En el encabezado hay un campo de texto **"URL de Apps Script (/exec)"** (`id="input-webapp-url"` en el código). Pegar ahí la URL `/exec` copiada en el paso 1.
3. Hacer clic en **"Guardar URL"**.
4. La app sincroniza automáticamente al abrir, y también se puede forzar con el botón **"Sincronizar"**.

## 4. Usar la app en el celular

La app no necesita instalación ni servidor: es un sitio estático.

1. Copiar el archivo `index.html` junto con las carpetas `css/` y `js/` (manteniendo la misma estructura de carpetas) al celular, por ejemplo vía Google Drive, USB o WhatsApp (comprimido en `.zip` y luego descomprimido).
2. Abrir `index.html` con el navegador del celular (Chrome, Safari, etc.).
3. La configuración de la URL del Web App (paso 3 arriba) se guarda en el propio navegador de cada celular, así que hay que pegarla una vez en cada dispositivo.

## Nota de seguridad

El enlace `/exec` del Web App da acceso de lectura a los precios de todos los proveedores **sin autenticación adicional** — cualquiera que tenga el enlace puede verlos. Está pensado para uso interno; no compartir el enlace fuera del equipo.
