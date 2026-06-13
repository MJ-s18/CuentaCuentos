// =============================================================
//  api/noticias.js  —  Vercel Serverless Function
//  GET /api/noticias
//  Scraping de noticias de unifranz.edu.bo/blog/
//  Caché in-memory de 1 hora (persiste entre invocaciones calientes)
// =============================================================

import * as cheerio from 'cheerio';

// ── Caché in-memory (sobrevive warm invocations en Vercel) ────
let _cache = null;      // { data, ts }
const CACHE_TTL = 3600; // segundos

// ── CORS headers ──────────────────────────────────────────────
const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// =============================================================
export default async function handler(req, res) {
  // OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(204).set(CORS).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, error: 'Método no permitido' });
  }

  Object.entries(CORS).forEach(([k, v]) => res.setHeader(k, v));

  // Usar caché si está vigente
  const now = Math.floor(Date.now() / 1000);
  if (_cache && now - _cache.ts < CACHE_TTL) {
    res.setHeader('X-Cache', 'HIT');
    return res.status(200).json({ ok: true, data: _cache.data, source: 'live' });
  }

  // ── Scraping ──────────────────────────────────────────────
  let html;
  try {
    const response = await fetch('https://unifranz.edu.bo/blog/', {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PHGVBot/1.0)' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    html = await response.text();
  } catch {
    // Fallo de red → noticias de respaldo
    return res.status(200).json({ ok: true, data: fallbackNoticias(), source: 'fallback' });
  }

  const noticias = parseNoticias(html);

  if (!noticias.length) {
    return res.status(200).json({ ok: true, data: fallbackNoticias(), source: 'fallback' });
  }

  // Actualizar caché
  _cache = { data: noticias, ts: now };

  res.setHeader('X-Cache', 'MISS');
  return res.status(200).json({ ok: true, data: noticias, source: 'live' });
}

// ── Parser (cheerio, equivalente al DOMXPath de PHP) ──────────
function parseNoticias(html) {
  const $ = cheerio.load(html);
  const noticias = [];

  $('article').each((_, art) => {
    if (noticias.length >= 3) return false; // break

    const $art = $(art);

    // Título
    const titulo = $art.find('h1,h2,h3').first().text().trim() || null;

    // Link
    let link = null;
    $art.find('a[href]').each((_, a) => {
      const href = $(a).attr('href') || '';
      if (href.includes('unifranz.edu.bo') || href.startsWith('/') || href.startsWith('http')) {
        link = href;
        return false; // break
      }
    });
    if (link && !link.startsWith('http')) {
      link = 'https://unifranz.edu.bo' + link;
    }

    // Imagen
    let imagen = null;
    $art.find('img[src]').each((_, img) => {
      const src = $(img).attr('src') || '';
      if (src && !src.startsWith('data:')) { imagen = src; return false; }
    });

    // Excerpt
    let desc = null;
    $art.find('p').each((_, p) => {
      const t = $(p).text().trim();
      if (t.length > 40) { desc = t.slice(0, 160) + '…'; return false; }
    });

    if (titulo && link) {
      noticias.push({ titulo, link, imagen, desc });
    }
  });

  return noticias;
}

// ── Noticias de respaldo ───────────────────────────────────────
function fallbackNoticias() {
  return [
    {
      titulo: 'Unifranz y Cannes Lions: Oportunidades Globales para el Talento Creativo',
      link:   'https://unifranz.edu.bo/blog/unifranz-y-cannes-lions-la-alianza-que-abre-oportunidades-globales-para-el-talento-creativo-boliviano/',
      imagen: 'https://unifranz.edu.bo/wp-content/uploads/2024/05/cannes-lions-unifranz.jpg',
      desc:   'La alianza entre Unifranz y Cannes Lions abre puertas para el talento creativo boliviano a nivel internacional.',
    },
    {
      titulo: 'Innovación en Ingeniería de Sistemas en Sede Santa Cruz',
      link:   'https://unifranz.edu.bo/blog/',
      imagen: 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&w=400&q=80',
      desc:   'Estudiantes de la sede Santa Cruz desarrollan nuevas plataformas web interactivas para la comunidad universitaria.',
    },
    {
      titulo: 'UNIFRANZ lanza nuevas carreras para el futuro profesional',
      link:   'https://unifranz.edu.bo/blog/',
      imagen: 'https://unifranz.edu.bo/wp-content/uploads/2023/09/unifranz-campus.jpg',
      desc:   'La universidad presenta su nueva oferta académica orientada a las demandas del mercado laboral actual.',
    },
  ];
}
