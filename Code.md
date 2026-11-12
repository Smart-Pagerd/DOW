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
- `logo.js` / `logo.png`: logo de DOWIE

## Catálogo
Se guarda en el `localStorage` del navegador (no se comparte entre equipos).
Para pasarlo a otra persona: **Exportar** genera un `.json` y **Importar** lo carga.

## Ajustar el precio
La función `ratioFor` en `app.js` define cuánto se reduce el monto original
(≈82 % menos en USD 500, ≈5.5 % menos en USD 20,000).

## Dependencias (CDN)
pdf.js 3.11.174 y jsPDF 2.5.1 desde cdnjs.
