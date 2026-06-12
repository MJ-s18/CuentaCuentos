// =========================================================================
//  supabase-client.js — Pequeñas Historias Grandes Valores
//  Inicialización y configuración del cliente de Supabase
// =========================================================================

// 1. REEMPLAZA ESTAS CREDENCIALES CUANDO VAYAS A PRODUCCIÓN
// Las encuentras en tu panel de Supabase: Project Settings -> API
const SUPABASE_URL = 'TU_SUPABASE_URL_AQUI';
const SUPABASE_ANON_KEY = 'TU_SUPABASE_KEY_AQUI';

// 2. Lógica de fallback para desarrollo/pruebas locales:
// Si no has cambiado las constantes de arriba, intentará leer del localStorage
// (las cuales se pueden configurar de forma interactiva en despliegue.html)
const finalUrl = (SUPABASE_URL === 'https://lzlikvheelblyqlrzwsc.supabase.co') 
  ? (localStorage.getItem('phgv_supabase_url') || '') 
  : SUPABASE_URL;

const finalKey = (SUPABASE_ANON_KEY === 'sb_publishable_MphuvrQjfGM7VrueC4U8jA_U3yEni53') 
  ? (localStorage.getItem('phgv_supabase_key') || '') 
  : SUPABASE_ANON_KEY;

// Instancia global del cliente de Supabase para tu aplicación
let supabase = null;

if (typeof window.supabase !== 'undefined') {
  if (finalUrl && finalKey) {
    try {
      supabase = window.supabase.createClient(finalUrl, finalKey);
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
