// =============================================
//  shared.js — Estado global y utilidades
//  Conectado a API PHP con caché en localStorage
// =============================================

'use strict';

// ── Estado global ────────────────────────────
let stories        = [];
let votedIds       = [];
let readIds        = [];
let currentStoryId = null;
let currentSpread  = 0;
let isFlipping     = false;
let usuarioId      = null;
let usuarioNombre  = null;
let usuarioAvatar  = null;

// ── Detectar rutas ────────────────────────────
const IS_IN_VIEWS = window.location.pathname.includes('/views/');
const API_BASE    = IS_IN_VIEWS ? '../api'            : './api';
const STORIES_PATH= IS_IN_VIEWS ? '../assets/cuentos.json' : './assets/cuentos.json';
const LOGIN_URL   = IS_IN_VIEWS ? '../login.html'     : 'login.html';

// ── Estado localStorage ───────────────────────
function loadState() {
  try {
    votedIds = JSON.parse(localStorage.getItem('phgv_voted') || '[]');
    readIds  = JSON.parse(localStorage.getItem('phgv_read')  || '[]');
  } catch (_) {}
}

function saveState() {
  try {
    localStorage.setItem('phgv_voted', JSON.stringify(votedIds));
    localStorage.setItem('phgv_read',  JSON.stringify(readIds));
  } catch (_) {}
}

function hasVoted(id)   { return votedIds.includes(id); }
function hasVotedAny()  { return votedIds.length > 0; }
function hasRead(id)    { return readIds.includes(id); }
function markAsRead(id) { if (!readIds.includes(id)) { readIds.push(id); saveState(); } }

// ── Verificar sesión Supabase ──────────────────
async function checkSession() {
  try {
    if (!supabase) return { ok: true, logueado: false };
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (session && session.user) {
      const user = session.user;
      usuarioId     = user.id;
      usuarioNombre = user.user_metadata?.full_name || user.email.split('@')[0];
      usuarioAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

      // Consultar el voto del usuario en la tabla 'votos' de Supabase
      const { data: votoData } = await supabase
        .from('votos')
        .select('cuento_id')
        .eq('usuario_id', user.id)
        .maybeSingle();

      if (votoData) {
        votedIds = [votoData.cuento_id];
        saveState();
      }

      return { ok: true, logueado: true, usuario_id: usuarioId, nombre: usuarioNombre, avatar_url: usuarioAvatar, voto_cuento: votedIds[0] };
    }
    return { ok: true, logueado: false };
  } catch (_) {
    return { ok: true, logueado: false };
  }
}

// ── Renderizar widget de usuario en el header ──
function renderUserWidget(sessionData) {
  const widget = document.getElementById('user-widget');
  if (!widget) return;

  if (sessionData?.logueado) {
    const nombre = sessionData.nombre || 'Usuario';
    const avatar = sessionData.avatar_url;
    widget.innerHTML = `
      <div class="user-info">
        ${avatar
          ? `<img src="${avatar}" alt="${nombre}" class="user-avatar">`
          : `<span class="user-initials">${nombre.charAt(0).toUpperCase()}</span>`}
        <span class="user-name">${nombre}</span>
        <button class="btn-logout" id="btn-logout" title="Cerrar sesión">
          <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1"/>
          </svg>
          Salir
        </button>
      </div>`;
    document.getElementById('btn-logout')?.addEventListener('click', logout);
  } else {
    widget.innerHTML = `
      <a href="${LOGIN_URL}" class="btn-login-header">Iniciar Sesión</a>`;
  }
}

// ── Logout Supabase ────────────────────────────
async function logout() {
  try {
    if (supabase) {
      await supabase.auth.signOut();
    }
  } catch (_) {}

  // Limpiar estado local
  usuarioId     = null;
  usuarioNombre = null;
  usuarioAvatar = null;
  localStorage.removeItem('phgv_voted');
  localStorage.removeItem('phgv_read');

  window.location.href = LOGIN_URL;
}

// ── Cargar cuentos con votos de Supabase ───────
async function loadStories() {
  const res = await fetch(STORIES_PATH);
  stories   = await res.json();

  stories.forEach(s => s.votes = 0);

  try {
    if (supabase) {
      const { data: votos, error } = await supabase
        .from('votos')
        .select('cuento_id');

      if (!error && votos) {
        const conteos = {};
        votos.forEach(v => {
          conteos[v.cuento_id] = (conteos[v.cuento_id] || 0) + 1;
        });

        stories.forEach(s => {
          s.votes = conteos[s.id] || 0;
        });

        const ordenados = [...stories].sort((a, b) => b.votes - a.votes);
        stories.forEach(s => {
          s.posicion = ordenados.findIndex(x => x.id === s.id) + 1;
        });
      }
    }
  } catch (_) {}
}

// ── Toast ─────────────────────────────────────
function showToast(msg, type = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className   = `toast toast--${type} show`;
  clearTimeout(window._toastTimer);
  window._toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

// ── Votación ──────────────────────────────────
let pendingVoteId = null;

function tryVote(id) {
  if (!usuarioId) {
    showToast('⚠️ Debes iniciar sesión para votar', 'warning');
    setTimeout(() => window.location.href = LOGIN_URL, 1500);
    return;
  }
  if (hasVoted(id)) {
    showToast('Ya votaste por esta historia', 'info');
    return;
  }
  if (hasVotedAny()) {
    const v = stories.find(s => s.id === votedIds[0]);
    showToast(`⛔ Ya votaste por "${v ? v.title : '…'}". Solo 1 voto por usuario.`, 'error');
    return;
  }
  if (!hasRead(id)) {
    showToast('📖 Primero debes leer el cuento completo', 'warning');
    return;
  }
  askVoteConfirmation(id);
}

function askVoteConfirmation(id) {
  const s = stories.find(x => x.id === id);
  if (!s) return;
  pendingVoteId = id;
  const el = document.getElementById('confirmStoryName');
  if (el) el.textContent = `"${s.title}"`;
  document.getElementById('confirmVoteOverlay')?.classList.add('show');
}

function confirmVoteYes() {
  if (pendingVoteId === null) return;
  const id = pendingVoteId;
  pendingVoteId = null;
  document.getElementById('confirmVoteOverlay')?.classList.remove('show');
  castVote(id);
}

function confirmVoteNo() {
  pendingVoteId = null;
  document.getElementById('confirmVoteOverlay')?.classList.remove('show');
  showToast('Voto cancelado');
}

async function castVote(id) {
  const s = stories.find(x => x.id === id);
  if (!s || hasVoted(id)) return;

  try {
    if (!supabase) throw new Error('Supabase no inicializado');

    const { error } = await supabase
      .from('votos')
      .insert([
        { usuario_id: usuarioId, cuento_id: id }
      ]);

    if (error) {
      if (error.code === '23505') {
        showToast('⛔ Ya registraste tu voto.', 'error');
        votedIds.push(id);
        saveState();
      } else {
        showToast(`⛔ Error: ${error.message}`, 'error');
      }
      return;
    }

    s.votes = (s.votes || 0) + 1;
    votedIds.push(id);
    saveState();
    showToast(`★ ¡Voto registrado para "${s.title}"!`, 'success');
  } catch (_) {
    s.votes = (s.votes || 0) + 1;
    votedIds.push(id);
    saveState();
    showToast('⚠️ Voto guardado localmente (sin conexión al servidor)', 'warning');
  }

  if (typeof renderGallery === 'function') renderGallery();
  if (typeof renderRanking === 'function') renderRanking();
}

// ── Ir al lector ──────────────────────────────
function goToStory(id) {
  sessionStorage.setItem('phgv_open_story', String(id));
  const base = IS_IN_VIEWS ? '' : 'views/';
  window.location.href = `${base}lector.html?id=${id}`;
}

function checkAutoOpen() {
  const id = parseInt(sessionStorage.getItem('phgv_open_story') || '0');
  if (!id) return;
  sessionStorage.removeItem('phgv_open_story');
  setTimeout(() => {
    const card = document.querySelector(`[data-story-id="${id}"]`);
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, 300);
}

// ── Auto-rotación de cards ────────────────────
let _autoIdx    = 0;
let _autoPaused = false;
let _autoTimer  = null;

function startAutoRotation(gridId) {
  if (_autoTimer) clearInterval(_autoTimer);
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.addEventListener('mouseenter', () => { _autoPaused = true;  resetAllCards(gridId); });
  grid.addEventListener('mouseleave', () => { _autoPaused = false; });
  _autoTimer = setInterval(() => {
    if (_autoPaused) return;
    const cards = document.querySelectorAll(`#${gridId} .card-cuento`);
    if (!cards.length) return;
    resetAllCards(gridId);
    activateCard(cards[_autoIdx]);
    _autoIdx = (_autoIdx + 1) % cards.length;
  }, 2500);
}

function activateCard(card) {
  card.style.transform   = 'translateY(-10px) scale(1.04)';
  card.style.boxShadow   = '0 20px 48px rgba(255,99,30,.55)';
  card.style.background  = 'linear-gradient(135deg,#c96a2d,#ff7a18,#d9231d)';
  card.style.borderColor = '#ff9944';
  card.style.transition  = 'all .35s ease';
  const titulo = card.querySelector('.card-titulo');
  const desc   = card.querySelector('.card-desc');
  const btns   = card.querySelectorAll('.btn-votar:not(.voted):not(.locked), .btn-leer');
  const portada= card.querySelector('.card-portada-color');
  if (titulo)  titulo.style.color = '#fff';
  if (desc)    desc.style.background = 'rgba(0,0,0,.28)';
  if (portada) portada.style.boxShadow = '4px 4px 0 rgba(0,0,0,.3)';
  btns.forEach(b => { b.style.background = '#fff'; b.style.color = '#c96a2d'; });
}

function resetCard(card) {
  card.style.transform   = 'translateY(0) scale(1)';
  card.style.boxShadow   = '';
  card.style.background  = 'var(--card-bg)';
  card.style.borderColor = 'var(--border)';
  card.style.transition  = 'all .35s ease';
  const titulo = card.querySelector('.card-titulo');
  const desc   = card.querySelector('.card-desc');
  const portada= card.querySelector('.card-portada-color');
  const btnV   = card.querySelector('.btn-votar:not(.voted):not(.locked)');
  const btnL   = card.querySelector('.btn-leer');
  if (titulo)  titulo.style.color = 'var(--text-light)';
  if (desc)    desc.style.background = 'var(--red)';
  if (portada) portada.style.boxShadow = '4px 4px 0 var(--orange-dark)';
  if (btnV) { btnV.style.background = 'var(--orange)'; btnV.style.color = '#fff'; }
  if (btnL) { btnL.style.background = 'var(--orange-light)'; btnL.style.color = '#3a2000'; }
}

function resetAllCards(gridId) {
  document.querySelectorAll(`#${gridId} .card-cuento`).forEach(resetCard);
}

function attachHoverEffects(gridId) {
  document.querySelectorAll(`#${gridId} .card-cuento`).forEach(card => {
    card.addEventListener('mouseenter', () => activateCard(card));
    card.addEventListener('mouseleave', () => resetCard(card));
  });
}
