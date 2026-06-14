// =============================================
//  shared.js — Pequeñas Historias Grandes Valores
//  Estado global y utilidades — MIGRADO A SUPABASE
//  v4 — Sistema admin local integrado
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
const IS_IN_VIEWS  = window.location.pathname.includes('/views/');
const STORIES_PATH = IS_IN_VIEWS ? '../assets/cuentos.json' : './assets/cuentos.json';
const LOGIN_URL    = IS_IN_VIEWS ? '../login.html'          : 'login.html';

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

// Asegurarnos de que el estado inicial se cargue de inmediato
loadState();

function hasVoted(id)   { return votedIds.includes(id); }
function hasVotedAny()  { return votedIds.length > 0; }
function hasRead(id)    { return readIds.includes(id); }
function markAsRead(id) { if (!readIds.includes(id)) { readIds.push(id); saveState(); } }

// =============================================
//  SISTEMA ADMIN LOCAL
//  Credenciales hardcodeadas, sin Supabase
// =============================================
const _ADMIN_USER = 'admi';
const _ADMIN_PASS = 'MNWPD';
const _ADMIN_KEY  = 'cc_admin';

function isAdmin() {
  return sessionStorage.getItem(_ADMIN_KEY) === 'true';
}

function _adminLogin(user, pass) {
  if (user === _ADMIN_USER && pass === _ADMIN_PASS) {
    sessionStorage.setItem(_ADMIN_KEY, 'true');
    return true;
  }
  return false;
}

function _adminLogout() {
  sessionStorage.removeItem(_ADMIN_KEY);
}

// Aplica visibilidad a elementos con data-admin
function applyAdminUI() {
  const admin = isAdmin();
  document.querySelectorAll('[data-admin]').forEach(el => {
    el.style.display = admin ? '' : 'none';
  });
}

// Modal de login admin
function openAdminModal() {
  if (document.getElementById('admin-modal')) return;

  const style = document.createElement('style');
  style.id = 'admin-modal-style';
  style.textContent = `
    #admin-modal{position:fixed;inset:0;background:rgba(0,0,0,.78);display:flex;
      align-items:center;justify-content:center;z-index:99999;
      backdrop-filter:blur(5px);animation:amFI .2s ease}
    @keyframes amFI{from{opacity:0}to{opacity:1}}
    .am-box{background:#1e1e1e;border:1.5px solid #ff7a18;border-radius:18px;
      padding:36px 32px 28px;width:min(370px,92vw);position:relative;
      box-shadow:0 24px 60px rgba(0,0,0,.6);animation:amSU .25s ease}
    @keyframes amSU{from{transform:translateY(18px);opacity:0}to{transform:translateY(0);opacity:1}}
    .am-close{position:absolute;top:13px;right:15px;background:none;border:none;
      color:#888;font-size:19px;cursor:pointer}
    .am-close:hover{color:#fff}
    .am-icon{font-size:38px;text-align:center;margin-bottom:8px}
    .am-title{font-family:'Fredoka',sans-serif;font-size:22px;font-weight:700;
      color:#f5f5f5;text-align:center;margin-bottom:4px}
    .am-sub{font-size:13px;color:#888;text-align:center;margin-bottom:22px}
    .am-field{margin-bottom:14px}
    .am-field label{display:block;font-size:11px;font-weight:700;color:#aaa;
      margin-bottom:6px;letter-spacing:.6px;text-transform:uppercase}
    .am-field input{width:100%;padding:11px 14px;background:#2a2a2a;
      border:1.5px solid #3a3a3a;border-radius:10px;color:#f5f5f5;
      font-family:'Fredoka',sans-serif;font-size:15px;outline:none;transition:border-color .2s}
    .am-field input:focus{border-color:#ff7a18}
    .am-error{font-size:13px;color:#f55;text-align:center;
      margin-bottom:10px;font-weight:600;display:none}
    .am-btn{width:100%;padding:13px;background:#ff7a18;border:none;
      border-radius:12px;color:#fff;font-family:'Fredoka',sans-serif;
      font-size:16px;font-weight:700;cursor:pointer;transition:background .2s}
    .am-btn:hover{background:#e06810}
    .am-btn:active{transform:scale(.98)}
  `;
  document.head.appendChild(style);

  const overlay = document.createElement('div');
  overlay.id = 'admin-modal';
  overlay.innerHTML = `
    <div class="am-box">
      <button class="am-close" id="am-close">✕</button>
      <div class="am-icon">🔐</div>
      <h2 class="am-title">Acceso Administrador</h2>
      <p class="am-sub">Solo personal autorizado</p>
      <div class="am-field">
        <label>Usuario</label>
        <input id="am-user" type="text" placeholder="Usuario" autocomplete="off">
      </div>
      <div class="am-field">
        <label>Contraseña</label>
        <input id="am-pass" type="password" placeholder="••••••">
      </div>
      <p class="am-error" id="am-error">❌ Usuario o contraseña incorrectos</p>
      <button class="am-btn" id="am-submit">Entrar</button>
    </div>`;
  document.body.appendChild(overlay);

  setTimeout(() => document.getElementById('am-user')?.focus(), 80);

  overlay.addEventListener('click', e => { if (e.target === overlay) _closeAdminModal(); });
  document.getElementById('am-close').addEventListener('click', _closeAdminModal);
  document.getElementById('am-submit').addEventListener('click', _handleAdminLogin);
  document.getElementById('am-pass').addEventListener('keydown', e => {
    if (e.key === 'Enter') _handleAdminLogin();
  });
}

function _closeAdminModal() {
  document.getElementById('admin-modal')?.remove();
  document.getElementById('admin-modal-style')?.remove();
}

function _handleAdminLogin() {
  const user = document.getElementById('am-user')?.value.trim();
  const pass = document.getElementById('am-pass')?.value.trim();
  const err  = document.getElementById('am-error');
  if (_adminLogin(user, pass)) {
    _closeAdminModal();
    showToast('✅ Bienvenido, Admin', 'success');
    setTimeout(() => location.reload(), 700);
  } else {
    if (err) err.style.display = 'block';
    document.getElementById('am-pass').value = '';
    document.getElementById('am-pass').focus();
  }
}

// Botón 🔑 en la nav
function _renderAdminToggle() {
  const nav = document.querySelector('.site-nav');
  if (!nav || nav.querySelector('.btn-admin-toggle')) return;

  const btn = document.createElement('button');
  btn.className   = 'btn-nav btn-admin-toggle';
  btn.title       = isAdmin() ? 'Cerrar sesión admin' : 'Admin';
  btn.textContent = isAdmin() ? '🔓 Admin' : '🔑';
  if (isAdmin()) btn.style.cssText = 'border-color:rgba(255,122,24,.5);color:var(--orange);';

  btn.addEventListener('click', () => {
    if (isAdmin()) {
      _adminLogout();
      showToast('Sesión admin cerrada', 'warning');
      setTimeout(() => location.reload(), 700);
    } else {
      openAdminModal();
    }
  });

  const widget = nav.querySelector('.user-widget');
  widget ? nav.insertBefore(btn, widget) : nav.appendChild(btn);
}

// Ocultar botón Setup/QR si no es admin
function _guardSetupBtn() {
  const btn = document.querySelector('.btn-nav--setup');
  if (!btn) return;
  btn.style.display = isAdmin() ? '' : 'none';
}

// =============================================
//  FIN SISTEMA ADMIN
// =============================================

// ── Verificar sesión con Supabase ─────────────
async function checkSession() {
  try {
    const sb = window.supabaseClient;
    if (!sb) return { ok: true, logueado: false };

    // Intentar obtener sesión directamente
    let { data: { session } } = await sb.auth.getSession();

    // Si no hay sesión pero hay hash en la URL (#access_token=...)
    // Supabase necesita un momento para procesarlo
    if (!session && window.location.hash.includes('access_token')) {
      await new Promise(r => setTimeout(r, 1500));
      const result = await sb.auth.getSession();
      session = result.data.session;
      // Limpiar el hash feo de la URL sin recargar
      history.replaceState(null, '', window.location.pathname);
    }

    if (!session) return { ok: true, logueado: false };

    const user    = session.user;
    usuarioId     = user.id;
    usuarioNombre = user.user_metadata?.full_name || user.email.split('@')[0];
    usuarioAvatar = user.user_metadata?.avatar_url || null;

    const { data: votoData } = await sb
      .from('votos')
      .select('cuento_id')
      .eq('usuario_id', usuarioId)
      .maybeSingle();

    if (votoData) { votedIds = [votoData.cuento_id]; saveState(); }

    return {
      ok: true, logueado: true,
      usuario_id:  usuarioId,
      nombre:      usuarioNombre,
      avatar_url:  usuarioAvatar,
      voto_cuento: votoData?.cuento_id ?? null,
    };
  } catch (e) {
    console.error('checkSession error:', e);
    return { ok: true, logueado: false };
  }
}

// ── Widget de usuario en el header ────────────
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
    widget.innerHTML = `<a href="${LOGIN_URL}" class="btn-login-header">Iniciar Sesión</a>`;
  }

  // Admin UI — siempre después de renderizar el header
  _renderAdminToggle();
  _guardSetupBtn();
  applyAdminUI();
}

// ── Logout ────────────────────────────────────
async function logout() {
  try {
    await window.supabaseClient.auth.signOut();
  } catch (_) {}

  usuarioId     = null;
  usuarioNombre = null;
  usuarioAvatar = null;
  localStorage.removeItem('phgv_voted');
  localStorage.removeItem('phgv_read');

  window.location.href = LOGIN_URL;
}

// ── Cargar cuentos desde JSON ─────────────────
async function loadStories() {
  const res = await fetch(STORIES_PATH);
  stories   = await res.json();

  // Los votos de cuentos.json son solo un placeholder.
  stories.forEach(s => { s.votes = 0; });

  try {
    const { data: votosData, error } = await window.supabaseClient
      .from('votos')
      .select('cuento_id');

    if (error) throw error;

    const conteo = {};
    (votosData || []).forEach(v => {
      conteo[v.cuento_id] = (conteo[v.cuento_id] || 0) + 1;
    });

    stories.forEach(s => {
      s.votes = conteo[s.id] || 0;
    });
  } catch (err) {
    console.error('⚠️ No se pudieron cargar los votos desde Supabase:', err);
  }
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
  if (hasVoted(id)) { showToast('Ya votaste por esta historia', 'info'); return; }
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
    const { error } = await window.supabaseClient
      .from('votos')
      .insert({ usuario_id: usuarioId, cuento_id: id });

    if (error) {
      if (error.code === '23505') {
        showToast('⛔ Ya registraste un voto anteriormente', 'error');
        if (!votedIds.includes(id)) votedIds.push(id);
        saveState();
      } else {
        showToast(`⛔ Error: ${error.message}`, 'error');
      }
      return;
    }

    s.votes = (s.votes || 0) + 1;
    if (!votedIds.includes(id)) votedIds.push(id);
    saveState();
    showToast(`★ ¡Voto registrado para "${s.title}"!`, 'success');

  } catch (_) {
    showToast('⚠️ Error de conexión al votar', 'error');
    return;
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
  const titulo  = card.querySelector('.card-titulo');
  const desc    = card.querySelector('.card-desc');
  const btns    = card.querySelectorAll('.btn-votar:not(.voted):not(.locked), .btn-leer');
  const portada = card.querySelector('.card-portada-color');
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
  const titulo  = card.querySelector('.card-titulo');
  const desc    = card.querySelector('.card-desc');
  const portada = card.querySelector('.card-portada-color');
  const btnV    = card.querySelector('.btn-votar:not(.voted):not(.locked)');
  const btnL    = card.querySelector('.btn-leer');
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

// ── PROGRAMACIÓN DE FUNCIONES EN TIEMPO REAL REQUERIDAS POR RANKING.HTML ──
let votosRealtimeChannel = null;

window.subscribeToVotes = function(callbackActualizarRanking) {
  const sb = window.supabaseClient;
  if (!sb) return;

  // Si ya hay un canal activo, lo removemos antes para no duplicar escuchas
  if (votosRealtimeChannel) {
    sb.removeChannel(votosRealtimeChannel);
  }

  // Creamos el canal en vivo vigilando la tabla 'votos'
  votosRealtimeChannel = sb
    .channel('cambios-votos-ranking')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'votos' },
      async (payload) => {
        console.log('⚡ ¡Cambio detectado en la tabla votos! Recalculando posiciones...', payload);
        
        // Volvemos a consultar a la base de datos para refrescar el conteo local de votos
        await loadStories();
        
        // Ejecutamos la función de pintar en pantalla que tiene ranking.html
        if (typeof callbackActualizarRanking === 'function') {
          callbackActualizarRanking();
        }
      }
    )
    .subscribe();
};

window.unsubscribeFromVotes = function() {
  const sb = window.supabaseClient;
  if (sb && votosRealtimeChannel) {
    sb.removeChannel(votosRealtimeChannel);
    votosRealtimeChannel = null;
  }
};
