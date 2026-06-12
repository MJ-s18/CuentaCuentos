// =========================================================================
//  supabase-client.js — Pequeñas Historias Grandes Valores
//  Inicialización y configuración del cliente de Supabase
// =========================================================================

// Credenciales directas de tu proyecto CuentaCuentos
const SUPABASE_URL = 'https://lzlikvheelblyqlrzwsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MphuvrQjfGM7VrueC4U8jA_U3yEni53';

// Instancia global en window para evitar conflictos con el objeto de la librería
window.supabaseClient = null;

if (typeof window.supabase !== 'undefined') {
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      console.log('⚡ Supabase inicializado correctamente.');
    } catch (err) {
      console.error('❌ Error al inicializar el cliente de Supabase:', err);
    }
  }
} else {
  console.error('❌ Supabase: La librería CDN de Supabase no se ha cargado. Verifica tus etiquetas <script>.');
}
