# DOWIE · Generador de cotizaciones

Página estática (HTML + CSS + JavaScript, sin frameworks ni build).

## Uso
1. Subir el PDF de cotización de Neutral Logistics / Pier 17.
2. Revisar y editar la cotización DOWIE generada.
3. Descargar el PDF o guardarla en el catálogo.

## Publicar en GitHub Pages
1. Subir estos archivos a la raíz de un repositorio.
2. Settings → Pages → Branch: `main`, carpeta `/ (root)` → Save.
3. La página queda en `https://USUARIO.github.io/REPOSITORIO/`.

## Archivos
- `index.html`: estructura
- `styles.css`: estilos
- `app.js`: lectura del PDF, cálculo de precio, generación del PDF y catálogo
- `si.js` / `si-assets.js`: Shipping Instruction (lógica, logo y plantilla de Excel)
- `supabase-shipping.sql`: tablas `clientes` y `shipping_instructions`
- `config.js`: URL y clave pública de Supabase
- `logo.js` / `logo.png`: logo de DOWIE

## Catálogo (Supabase)
1. En Supabase, ejecutar el SQL de la tabla `cotizaciones` (SQL Editor).
2. Abrir `config.js` y pegar la `anon public key` en `SUPABASE_KEY`.
3. Subir los cambios. El catálogo queda compartido entre todos los dispositivos.

Si `SUPABASE_KEY` sigue con el texto de ejemplo, la página guarda solo en el
navegador (`localStorage`). **Exportar** / **Importar** genera y carga un `.json`.

Nunca poner la clave `service_role` en estos archivos.

## Shipping Instruction
Pestaña nueva: se sube el Packing List (.xlsx, .xls, .ods o .csv) y se genera
el Shipping Instruction en **PDF** o **Excel** (la plantilla de Excel va
incrustada en `si-assets.js`, por eso el archivo sale idéntico).
- Hay que elegir **LCL o FCL** antes de descargar.
- El CNEE se puede elegir de la lista de clientes (rellena nombre y RNC) o dejarlo personalizado.
- Notify party viene prellenado con los datos de DOWIE.
- Los clientes y el historial se guardan en Supabase: ejecutar `supabase-shipping.sql` una vez.
- Para agregar un cliente fijo: editar `SI_CLIENTS` en `si.js` o usar el botón «Guardar como cliente».

## Ajustar el precio
La función `ratioFor` en `app.js` define cuánto se reduce el monto original
(≈82 % menos en USD 500, ≈5.5 % menos en USD 20,000).

## Dependencias (CDN)
pdf.js 3.11.174 y jsPDF 2.5.1 desde cdnjs.
