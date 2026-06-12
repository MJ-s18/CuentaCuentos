=========================================================================
//  supabase-client.js — Pequeñas Historias Grandes Valores
//  Inicialización y configuración del cliente de Supabase
// =========================================================================
// 1. REEMPLAZA ESTAS CREDENCIALES CUANDO VAYAS A PRODUCCIÓN
// Las encuentras en tu panel de Supabase: Project Settings -> API
const SUPABASE_URL = 'https://lzlikvheelblyqlrzwsc.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_MphuvrQjfGM7VrueC4U8jA_U3yEni53';
// 2. Lógica de fallback para desarrollo/pruebas locales:
// Si no has cambiado las constantes de arriba, intentará leer del localStorage
// (las cuales se pueden configurar de forma interactiva en despliegue.html)
const finalUrl = (SUPABASE_URL === 'TU_SUPABASE_URL_AQUI') 
  ? (localStorage.getItem('phgv_supabase_url') || '') 
  : SUPABASE_URL;
const finalKey = (SUPABASE_ANON_KEY === 'TU_SUPABASE_KEY_AQUI') 
  ? (localStorage.getItem('phgv_supabase_key') || '') 
  : SUPABASE_ANON_KEY;
// Instancia global en window para evitar conflictos con el objeto de la librería
window.supabaseClient = null;
if (typeof window.supabase !== 'undefined') {
  if (finalUrl && finalKey) {
    try {
      window.supabaseClient = window.supabase.createClient(finalUrl, finalKey);
      console.log('⚡ Supabase inicializado correctamente.');
    } catch (err) {
      console.error('❌ Error al inicializar el cliente de Supabase:', err);
    }
  } else {
    console.warn('⚠️ Supabase: Credenciales no configuradas. Por favor, abre despliegue.html para configurarlas.');
  }
} else {
  console.error('❌ Supabase: La librería CDN de Supabase no se ha cargado. Verifica tus etiquetas <script>.');
}
