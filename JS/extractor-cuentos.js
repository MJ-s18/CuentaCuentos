// =========================================================================
//  JS/extractor-cuentos.js
//  Pequeñas Historias Grandes Valores
//
//  Extrae texto de archivos PDF o Word (.docx) directamente en el navegador
//  (sin servidor) y lo divide automáticamente en páginas con el formato
//  { lt, l, r } que ya usa el lector (lector.html / cuentos.json).
//
//  Librerías usadas (CDN, sin instalación):
//   - pdf.js     → extraer texto de PDF
//   - mammoth.js → extraer texto de Word (.docx)
// =========================================================================

const EXTRACTOR_CONFIG = {
  // Cuántos caracteres aprox. entran bien en media página del libro
  // (ajustado a ojo según el diseño actual del lector — ver book-text en lector.html)
  CARACTERES_POR_MEDIA_PAGINA: 320,
  // Título genérico para los capítulos cuando no se puede detectar uno real
  CAPITULO_GENERICO: 'Capítulo',
};

/**
 * Punto de entrada principal.
 * Recibe un File (input type="file") y devuelve:
 *   { texto: string, paginas: [{lt, l, r}, ...] }
 */
async function extraerYPaginarCuento(file) {
  const ext = file.name.split('.').pop().toLowerCase();
  let textoCompleto = '';

  if (ext === 'pdf') {
    textoCompleto = await extraerTextoPDF(file);
  } else if (ext === 'docx') {
    textoCompleto = await extraerTextoWord(file);
  } else if (ext === 'doc') {
    throw new Error('Los archivos .doc antiguos no son compatibles. Por favor, guardá el archivo como .docx desde Word y subilo de nuevo.');
  } else if (ext === 'txt') {
    textoCompleto = await file.text();
  } else {
    throw new Error('Formato no soportado. Subí un archivo .pdf, .docx o .txt');
  }

  if (!textoCompleto || textoCompleto.trim().length < 30) {
    throw new Error('No se pudo extraer texto del archivo, o el cuento está vacío. Verificá que el PDF no sea una imagen escaneada.');
  }

  const paginas = paginarTexto(textoCompleto);
  return { texto: textoCompleto, paginas };
}

// ── Extracción de PDF usando pdf.js ──────────────────────────────────────
async function extraerTextoPDF(file) {
  if (typeof pdfjsLib === 'undefined') {
    throw new Error('La librería pdf.js no está cargada. Verificá el <script> en admin.html');
  }

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let textoCompleto = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Reconstruir párrafos: agrupar items de texto por línea aproximada (Y)
    let lineaActualY = null;
    let lineaTexto = '';
    const lineas = [];

    for (const item of content.items) {
      const y = Math.round(item.transform[5]);
      if (lineaActualY === null) lineaActualY = y;

      // Si la diferencia en Y es grande, es una línea nueva
      if (Math.abs(y - lineaActualY) > 3) {
        if (lineaTexto.trim()) lineas.push(lineaTexto.trim());
        lineaTexto = item.str;
        lineaActualY = y;
      } else {
        lineaTexto += (lineaTexto && !lineaTexto.endsWith(' ') ? ' ' : '') + item.str;
      }
    }
    if (lineaTexto.trim()) lineas.push(lineaTexto.trim());

    textoCompleto += lineas.join('\n') + '\n\n';
  }

  return limpiarTexto(textoCompleto);
}

// ── Extracción de Word (.docx) usando mammoth.js ─────────────────────────
async function extraerTextoWord(file) {
  if (typeof mammoth === 'undefined') {
    throw new Error('La librería mammoth.js no está cargada. Verificá el <script> en admin.html');
  }

  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return limpiarTexto(result.value);
}

// ── Limpieza de texto extraído ───────────────────────────────────────────
function limpiarTexto(texto) {
  return texto
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')        // máximo 1 línea vacía entre párrafos
    .replace(/[ \t]+/g, ' ')            // espacios múltiples → uno
    .replace(/^\s+|\s+$/g, '')          // trim general
    .trim();
}

/**
 * Algoritmo de paginado automático.
 * Divide el texto en párrafos, detecta posibles títulos de capítulo,
 * y los agrupa en páginas {lt, l, r} respetando el tamaño visual del libro.
 */
function paginarTexto(textoCompleto) {
  // 1. Separar en párrafos (por doble salto de línea o salto simple largo)
  const parrafosBrutos = textoCompleto
    .split(/\n\n+/)
    .flatMap(bloque => bloque.split(/\n/))
    .map(p => p.trim())
    .filter(p => p.length > 0);

  // 2. Detectar capítulos: líneas cortas (<60 caracteres) que parecen títulos
  //    Ej: "Capítulo 1", "El comienzo", "I.", etc. No terminan en punto normalmente.
  const bloques = []; // [{ titulo, parrafos: [...] }]
  let bloqueActual = { titulo: null, parrafos: [] };

  const pareceTitulo = (texto) => {
    if (texto.length > 60) return false;
    if (/^(capítulo|capitulo|parte|chapter)\s*\d*/i.test(texto)) return true;
    // Línea corta sin punto final y con mayúscula inicial → probable título
    if (texto.length < 45 && !texto.endsWith('.') && /^[A-ZÁÉÍÓÚÑ]/.test(texto)) return true;
    return false;
  };

  for (const parrafo of parrafosBrutos) {
    if (pareceTitulo(parrafo) && bloqueActual.parrafos.length > 0) {
      // Cerrar bloque anterior y abrir uno nuevo
      bloques.push(bloqueActual);
      bloqueActual = { titulo: parrafo, parrafos: [] };
    } else if (pareceTitulo(parrafo) && bloqueActual.parrafos.length === 0 && !bloqueActual.titulo) {
      bloqueActual.titulo = parrafo;
    } else {
      bloqueActual.parrafos.push(parrafo);
    }
  }
  if (bloqueActual.parrafos.length > 0) bloques.push(bloqueActual);

  // Si no se detectó ningún capítulo, todo es un solo bloque
  if (bloques.length === 0) {
    bloques.push({ titulo: null, parrafos: parrafosBrutos });
  }

  // 3. Convertir cada bloque en "medias páginas" según longitud de caracteres
  const mediasPaginas = []; // [{ lt, texto }]
  let capituloNum = 1;

  for (const bloque of bloques) {
    const tituloCapitulo = bloque.titulo || `${EXTRACTOR_CONFIG.CAPITULO_GENERICO} ${capituloNum}`;
    capituloNum++;

    let acumulado = '';
    for (const parrafo of bloque.parrafos) {
      const candidato = acumulado ? acumulado + ' ' + parrafo : parrafo;

      if (candidato.length > EXTRACTOR_CONFIG.CARACTERES_POR_MEDIA_PAGINA && acumulado) {
        // Cerrar la media página actual y empezar otra con este párrafo
        mediasPaginas.push({ lt: tituloCapitulo, texto: acumulado });
        acumulado = parrafo;
      } else {
        acumulado = candidato;
      }
    }
    if (acumulado) mediasPaginas.push({ lt: tituloCapitulo, texto: acumulado });
  }

  // 4. Agrupar las medias páginas de 2 en 2 → spreads {lt, l, r}
  const paginas = [];
  for (let i = 0; i < mediasPaginas.length; i += 2) {
    const izq = mediasPaginas[i];
    const der = mediasPaginas[i + 1];
    paginas.push({
      lt: izq.lt,
      l:  izq.texto,
      r:  der ? der.texto : '', // si es impar, la derecha queda vacía
    });
  }

  return paginas;
}

// ── Utilidad: generar un color de portada aleatorio agradable ───────────
function generarColorPortada() {
  const paleta = ['#ff8c1a', '#9ec93a', '#1ab8b8', '#b830b8', '#e8731a', '#d64545', '#3a7bd5', '#e6b800'];
  return paleta[Math.floor(Math.random() * paleta.length)];
}

// Exportar para uso en admin.html
window.extraerYPaginarCuento = extraerYPaginarCuento;
window.generarColorPortada    = generarColorPortada;
