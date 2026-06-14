// =============================================
//  JS/admin.js
//  Sistema de admin local (sin Supabase)
//  Uso: import { isAdmin, adminLogin, adminLogout } from './admin.js'
// =============================================
 
const ADMIN_USER = 'admi';
const ADMIN_PASS = 'MNWPD';
const SESSION_KEY = 'cc_admin';
 
// ── Verificar si hay sesión activa ────────────
export function isAdmin() {
  return sessionStorage.getItem(SESSION_KEY) === 'true';
}
 
// ── Login ──────────────────────────────────────
export function adminLogin(user, pass) {
  if (user === ADMIN_USER && pass === ADMIN_PASS) {
    sessionStorage.setItem(SESSION_KEY, 'true');
    return true;
  }
  return false;
}
 
// ── Logout ─────────────────────────────────────
export function adminLogout() {
  sessionStorage.removeItem(SESSION_KEY);
}
 
// ── Aplicar visibilidad en toda la página ──────
// Llama esto en cada página que tenga elementos admin
export function applyAdminUI() {
  const admin = isAdmin();
 
  // Mostrar u ocultar TODOS los elementos con data-admin
  document.querySelectorAll('[data-admin]').forEach(el => {
    el.style.display = admin ? '' : 'none';
  });
}
 
