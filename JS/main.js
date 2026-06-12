// =============================================
//  main.js — login.html
//  Maneja Login, Registro y Google OAuth
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  const loginForm  = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const googleBtn  = document.getElementById('google-login-btn');
  const toggle     = document.getElementById('card-toggle');

  // Detecta si estamos en /views/ o en raíz
  const API = window.location.pathname.includes('/views/') ? '../api' : './api';
  const CATALOGO = window.location.pathname.includes('/views/') ? 'catalogo.html' : 'views/catalogo.html';

  // ── Mostrar error desde URL (Google callback error) ──────────────────────
  const urlParams = new URLSearchParams(window.location.search);
  const urlError  = urlParams.get('error');
  if (urlError) showBanner('error', decodeURIComponent(urlError));

  // ── Si ya hay sesión, redirigir ────────────────────────────────────────
  checkAndRedirect();

  // ── Helpers UI ────────────────────────────────────────────────────────
  function setLoading(form, loading) {
    const btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    btn.disabled = loading;
    btn.dataset.originalText = btn.dataset.originalText || btn.textContent;
    btn.textContent = loading ? 'Cargando…' : btn.dataset.originalText;
    btn.style.opacity = loading ? '0.65' : '1';
  }

  function showBanner(type, msg) {
    // Eliminar banner anterior si existe
    document.querySelector('.auth-banner')?.remove();

    const div = document.createElement('div');
    div.className = `auth-banner auth-banner--${type}`;
    div.textContent = msg;
    document.body.insertAdjacentElement('afterbegin', div);

    if (type !== 'error') {
      setTimeout(() => div.remove(), 4000);
    }
  }

  function showFieldError(input, msg) {
    clearFieldError(input);
    input.classList.add('input-error');
    const span = document.createElement('span');
    span.className = 'field-error';
    span.textContent = msg;
    input.insertAdjacentElement('afterend', span);
  }

  function clearFieldError(input) {
    input.classList.remove('input-error');
    input.nextElementSibling?.classList.contains('field-error')
      && input.nextElementSibling.remove();
  }

  function clearAllErrors(form) {
    form.querySelectorAll('.input-error').forEach(el => el.classList.remove('input-error'));
    form.querySelectorAll('.field-error').forEach(el => el.remove());
    document.querySelector('.auth-banner')?.remove();
  }

  async function checkAndRedirect() {
    try {
      if (!supabase) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session && session.user) {
        window.location.href = CATALOGO;
      }
    } catch (_) { /* sin servidor */ }
  }

  // ── LOGIN ─────────────────────────────────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      clearAllErrors(loginForm);

      const email    = loginForm.email.value.trim();
      const password = loginForm.password.value;

      // Validación front
      if (!email)    { showFieldError(loginForm.email,    'Ingresá tu email');      return; }
      if (!password) { showFieldError(loginForm.password, 'Ingresá tu contraseña'); return; }

      setLoading(loginForm, true);

      try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (error) {
          setLoading(loginForm, false);
          showBanner('error', error.message || 'Error al iniciar sesión');
        } else {
          const user = data.user;
          const nombre = user.user_metadata?.full_name || email.split('@')[0];
          
          // Buscar si tiene voto registrado
          const { data: votoData } = await supabase
            .from('votos')
            .select('cuento_id')
            .eq('usuario_id', user.id)
            .maybeSingle();

          if (votoData) {
            syncVotoLocalStorage(votoData.cuento_id);
          }

          showBanner('success', `¡Bienvenido, ${nombre}! Redirigiendo…`);
          setTimeout(() => window.location.href = CATALOGO, 800);
        }
      } catch (err) {
        setLoading(loginForm, false);
        showBanner('error', 'Error al conectar con la base de datos de Supabase.');
      }
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
      const telefono = signupForm.number?.value?.trim() || '';

      // Validaciones front-end
      let valid = true;
      if (!nombre)                  { showFieldError(signupForm.name,     'Ingresá tu nombre');           valid = false; }
      if (!email)                   { showFieldError(signupForm.email,    'Ingresá tu email');             valid = false; }
      if (password.length < 8)     { showFieldError(signupForm.password, 'Mínimo 8 caracteres');          valid = false; }
      if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        showFieldError(signupForm.password, 'La contraseña debe tener letras y números');
        valid = false;
      }
      if (!valid) return;

      setLoading(signupForm, true);

      try {
        if (!supabase) throw new Error('Supabase no inicializado');
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: nombre,
              phone: telefono
            }
          }
        });

        if (error) {
          setLoading(signupForm, false);
          showBanner('error', error.message || 'Error al registrarse');
          if (error.message.includes('already') || error.message.includes('taken') || error.message.includes('exists')) {
            showFieldError(signupForm.email, 'Este email ya está registrado');
            if (toggle) { toggle.checked = false; }
          }
        } else {
          if (data.session) {
            showBanner('success', `¡Bienvenido, ${nombre}! Redirigiendo…`);
            setTimeout(() => window.location.href = CATALOGO, 800);
          } else {
            showBanner('success', '¡Cuenta creada! Por favor revisa tu correo para verificar tu cuenta e iniciar sesión.');
            setLoading(signupForm, false);
          }
        }
      } catch (err) {
        setLoading(signupForm, false);
        showBanner('error', 'Error al conectar con la base de datos de Supabase.');
      }
    });
  }

  // ── GOOGLE OAuth ──────────────────────────────────────────────────────
  // Redirige al endpoint PHP que inicia el flujo OAuth real con Google
  if (googleBtn) {
    googleBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      googleBtn.disabled    = true;
      googleBtn.textContent = 'Conectando con Google…';
      try {
        if (!supabase) throw new Error('Supabase no inicializado');
        
        const redirectUrl = window.location.origin + window.location.pathname.replace('login.html', 'views/catalogo.html');
        
        const { error } = await supabase.auth.signInWithOAuth({
          provider: 'google',
          options: {
            redirectTo: redirectUrl
          }
        });
        
        if (error) throw error;
      } catch (err) {
        googleBtn.disabled    = false;
        googleBtn.textContent = 'Continuar con Google';
        showBanner('error', err.message || 'Error al conectar con Google OAuth');
      }
    });
  }

  // ── Sincronizar voto con localStorage ────────────────────────────────
  function syncVotoLocalStorage(votoCuento) {
    if (!votoCuento) return;
    try {
      const voted = JSON.parse(localStorage.getItem('phgv_voted') || '[]');
      if (!voted.includes(votoCuento)) {
        voted.push(votoCuento);
        localStorage.setItem('phgv_voted', JSON.stringify(voted));
      }
    } catch (_) {}
  }

  // ── Limpiar errores al tipear ─────────────────────────────────────────
  document.querySelectorAll('.flip-card__input').forEach(input => {
    input.addEventListener('input', () => clearFieldError(input));
  });

});
