// =============================================
//  main.js — login.html
//  Maneja Login, Registro y Google OAuth
//  MIGRADO A SUPABASE AUTH (sin PHP)
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const googleBtn  = document.getElementById('google-login-btn');

  const CATALOGO = window.location.pathname.includes('/views/')
    ? 'catalogo.html'
    : 'views/catalogo.html';

  // ── Manejar callback de OAuth (Google redirige de vuelta aquí) ────────
  // Supabase inserta el token en el hash de la URL tras el redirect
  window.supabaseClient.auth.onAuthStateChange((event, session) => {
    if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) {
      // Vino del redirect de Google OAuth → ir al catálogo
      if (window.location.hash.includes('access_token')) {
        window.location.replace(CATALOGO);
      }
    }
  });

  // ── Error desde URL ───────────────────────────────────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const urlError  = urlParams.get('error_description') || urlParams.get('error');
  if (urlError) showBanner('error', decodeURIComponent(urlError));

  // ── Si ya hay sesión activa, redirigir ────────────────────────────────
  checkAndRedirect();

  // ── Helpers UI ────────────────────────────────────────────────────────
  function setLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent  = loading ? 'Cargando…' : btn.dataset.originalText;
    btn.style.opacity = loading ? '0.65' : '1';
  }

  function showBanner(type, msg) {
    document.querySelector('.auth-banner')?.remove();
    const div = document.createElement('div');
    div.className   = `auth-banner auth-banner--${type}`;
    div.textContent = msg;
    document.body.insertAdjacentElement('afterbegin', div);
    if (type !== 'error') setTimeout(() => div.remove(), 4000);
  }

  function showFieldError(input, msg) {
    clearFieldError(input);
    input.classList.add('input-error');
    const span = document.createElement('span');
    span.className   = 'field-error';
    span.textContent = msg;
    input.insertAdjacentElement('afterend', span);
  }

  function clearFieldError(input) {
    input.classList.remove('input-error');
    if (input.nextElementSibling?.classList.contains('field-error')) {
      input.nextElementSibling.remove();
    }
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelector('.auth-banner')?.remove();
  }

  async function checkAndRedirect() {
    try {
      const { data: { session } } = await window.supabaseClient.auth.getSession();
      if (session) window.location.replace(CATALOGO);
    } catch (_) {}
  }

  // ── LOGIN con email/contraseña ────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(loginForm);

      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;

      if (!email)    { showFieldError(loginForm.email,    'Ingresá tu email');       return; }
      if (!password) { showFieldError(loginForm.password, 'Ingresá tu contraseña');  return; }

      setLoading(loginForm, true);

      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setLoading(loginForm, false);
        // Traducir mensajes comunes de Supabase al español
        const msg = error.message.includes('Invalid login credentials')
          ? 'Email o contraseña incorrectos'
          : error.message.includes('Email not confirmed')
          ? 'Confirma tu email antes de ingresar (revisa tu correo)'
          : error.message;
        showBanner('error', msg);
        return;
      }

      const nombre = data.user.user_metadata?.full_name || data.user.email.split('@')[0];
      showBanner('success', `¡Bienvenido, ${nombre}! Redirigiendo…`);
      setTimeout(() => window.location.replace(CATALOGO), 800);
    });
  }

  // ── REGISTRO ──────────────────────────────────────────────────────────
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(signupForm);

      const nombre   = signupForm.name.value.trim();
      const email    = signupForm.email.value.trim();
      const password = signupForm.password.value;

      let valid = true;
      if (!nombre)                   { showFieldError(signupForm.name,     'Ingresá tu nombre');          valid = false; }
      if (!email)                    { showFieldError(signupForm.email,    'Ingresá tu email');            valid = false; }
      if (password.length < 8)      { showFieldError(signupForm.password, 'Mínimo 8 caracteres');         valid = false; }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        showFieldError(signupForm.password, 'La contraseña debe tener letras y números');
        valid = false;
      }
      if (!valid) return;

      setLoading(signupForm, true);

      const { data, error } = await window.supabaseClient.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: nombre },
          // Redirigir aquí después de confirmar email (si activaste confirmación)
          emailRedirectTo: window.location.origin + '/' + CATALOGO,
        },
      });

      if (error) {
        setLoading(signupForm, false);
        const msg = error.message.includes('already registered') || error.message.includes('already been registered')
          ? 'Este email ya está registrado'
          : error.message;
        showBanner('error', msg);
        if (msg.includes('ya está registrado')) {
          showFieldError(signupForm.email, 'Este email ya está registrado');
        }
        return;
      }

      // Si Supabase requiere confirmación de email
      if (data.user && !data.session) {
        setLoading(signupForm, false);
        showBanner('success', `¡Registro exitoso! Revisa tu email (${email}) para confirmar tu cuenta.`);
        return;
      }

      // Registro directo sin confirmación (si lo desactivaste en Supabase)
      showBanner('success', `¡Bienvenido, ${nombre}! Redirigiendo…`);
      setTimeout(() => window.location.replace(CATALOGO), 800);
    });
  }

  // ── GOOGLE OAuth ──────────────────────────────────────────────────────
  if (googleBtn) {
    googleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      googleBtn.disabled    = true;
      googleBtn.textContent = 'Conectando con Google…';

      const { error } = await window.supabaseClient.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Supabase redirige aquí tras el login de Google
          redirectTo: window.location.origin + '/' + CATALOGO,
        },
      });

      if (error) {
        googleBtn.disabled    = false;
        googleBtn.textContent = 'Continuar con Google';
        showBanner('error', 'Error al conectar con Google: ' + error.message);
      }
      // Si no hay error, el navegador fue redirigido automáticamente a Google
    });
  }

  // ── Limpiar errores al tipear ─────────────────────────────────────────
  document.querySelectorAll('.flip-card__input').forEach(input => {
    input.addEventListener('input', () => clearFieldError(input));
  });

});
