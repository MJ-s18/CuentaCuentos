// =========================================================================
//  supabase-client.js — Pequeñas Historias Grandes Valores
// =========================================================================

// Credenciales de Supabase
const SUPABASE_URL = 'https://lzlikvheelblyqlrzwsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MphuvrQjfGM7VrueC4U8jA_U3yEni53';

// Instancia global
window.supabaseClient = null;

if (typeof window.supabase !== 'undefined') {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      window.supabaseClient = window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_ANON_KEY
      );
      console.log('⚡ Supabase inicializado correctamente.');
    } catch (err) {
      console.error('❌ Error al inicializar el cliente de Supabase:', err);
    }
  } else {
    console.warn('⚠️ Credenciales no configuradas.');
  }
} else {
  console.error(
    '❌ La librería CDN de Supabase no se ha cargado. Verifica tus etiquetas <script>.'
  );
}
