
// =========================================================================
//  supabase-client.js — Pequeñas Historias Grandes Valores
//  Inicialización del cliente de Supabase
//  ⚠️  REEMPLAZA SUPABASE_ANON_KEY con tu key real (empieza con eyJ...)
//      La encuentras en: Supabase → Project Settings → API → anon public
// =========================================================================

const SUPABASE_URL      = 'https://lzlikvheelblyqlrzwsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MphuvrQjfGM7VrueC4U8jA_U3yEni53';
// Ejemplo real: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIs...'

window.supabaseClient = null;

if (typeof window.supabase !== 'undefined') {
  try {
    window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log('⚡ Supabase inicializado correctamente.');
  } catch (err) {
    console.error('❌ Error al inicializar Supabase:', err);
  }
} else {
  console.error('❌ La librería CDN de Supabase no se cargó. Verifica el <script> CDN en tu HTML.');
}
