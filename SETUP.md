# 🚀 Guía de Instalación — Pequeñas Historias Grandes Valores

## Estructura del proyecto

```
PCC1/
├── api/
│   ├── config.php           ← Configuración DB + helpers
│   ├── login.php            ← POST: login con email/contraseña
│   ├── registro.php         ← POST: crear cuenta
│   ├── sesion.php           ← GET: estado de sesión / POST: logout
│   ├── votar.php            ← POST: registrar voto
│   ├── ranking.php          ← GET: ranking de cuentos
│   ├── google_auth.php      ← GET: inicia flujo Google OAuth
│   ├── google_callback.php  ← GET: callback de Google (crea/loguea usuario)
│   └── sync_cuentos.php     ← GET: sincroniza cuentos.json → BD (1 vez)
├── assets/
│   └── cuentos.json
├── JS/
│   ├── main.js              ← Login/Registro/Google
│   └── shared.js            ← Estado global, votos, sesión, logout
├── views/
│   ├── catalogo.html
│   ├── lector.html
│   └── ranking.html
├── styles/
├── sql/
│   └── schema.sql           ← Esquema completo de la BD
├── login.html
└── index.html
```

---

## Paso 1 — Configurar XAMPP

1. Iniciar **Apache** y **MySQL** en XAMPP.
2. Copiar la carpeta `PCC1/` dentro de `C:\xampp\htdocs\` (Windows) o `/opt/lampp/htdocs/` (Linux).
3. Abrir en el navegador: `http://localhost/PCC1/`

---

## Paso 2 — Crear la base de datos

1. Abrir **phpMyAdmin**: `http://localhost/phpmyadmin`
2. Importar el archivo `sql/schema.sql`:
   - Menú → Importar → Seleccionar archivo → `schema.sql` → Ejecutar
3. Esto crea:
   - La base de datos `phgv_db`
   - Las tablas: `usuarios`, `cuentos`, `votos`, `sesiones`
   - La vista: `v_ranking`

---

## Paso 3 — Sincronizar los cuentos

Visitar **una sola vez**:

```
http://localhost/PCC1/api/sync_cuentos.php
```

Esto carga todos los cuentos de `assets/cuentos.json` a la tabla `cuentos`.

> ⚠️ Solo funciona desde `localhost`. Si cambiás el JSON, volvé a ejecutarlo.

---

## Paso 4 — Configurar Google OAuth (Login con Google)

### 4.1 Crear proyecto en Google Cloud Console

1. Ir a https://console.cloud.google.com
2. Crear un nuevo proyecto (ej: `phgv-concurso`)
3. Ir a **APIs y servicios → Pantalla de consentimiento OAuth**
   - Tipo de usuario: **Externo**
   - Completar nombre de la app, email, etc.
   - Guardar

### 4.2 Crear credenciales OAuth 2.0

1. Ir a **APIs y servicios → Credenciales → + Crear credenciales → ID de cliente OAuth 2.0**
2. Tipo de aplicación: **Aplicación web**
3. **URIs de redireccionamiento autorizados** — agregar:
   ```
   http://localhost/PCC1/api/google_callback.php
   ```
   *(Para producción agregar también tu dominio real)*
4. Guardar. Copiar el **Client ID** y **Client Secret**.

### 4.3 Pegar las credenciales en config.php

```php
define('GOOGLE_CLIENT_ID',     'TU_CLIENT_ID.apps.googleusercontent.com');
define('GOOGLE_CLIENT_SECRET', 'TU_CLIENT_SECRET');
define('GOOGLE_REDIRECT_URI',  'http://localhost/PCC1/api/google_callback.php');
define('APP_URL',              'http://localhost/PCC1');
```

---

## Paso 5 — Probar

| URL | Descripción |
|-----|-------------|
| `http://localhost/PCC1/` | Página de inicio |
| `http://localhost/PCC1/login.html` | Login / Registro |
| `http://localhost/PCC1/views/catalogo.html` | Catálogo de cuentos |
| `http://localhost/PCC1/views/ranking.html` | Ranking |

---

## Para producción (hosting)

1. **Variables de entorno**: mover credenciales a `.env` o variables de servidor
   ```
   DB_HOST=localhost
   DB_NAME=phgv_db
   DB_USER=usuario_db
   DB_PASS=contraseña_segura
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   GOOGLE_REDIRECT_URI=https://tudominio.com/api/google_callback.php
   APP_URL=https://tudominio.com
   ```

2. **HTTPS**: obligatorio para Google OAuth en producción. Activar certificado SSL.

3. **Activar `cookie_secure`** en `config.php`:
   ```php
   // ini_set('session.cookie_secure', '1'); // ← descomentar
   // 'secure' => true,                      // ← descomentar
   ```

4. **Cambiar CORS** en `config.php`:
   ```php
   // Cambiar '*' por tu dominio real
   header('Access-Control-Allow-Origin: https://tudominio.com');
   ```

5. **Proteger `sync_cuentos.php`**: solo llamar desde el servidor o eliminar el archivo tras la instalación.

---

## Mejoras implementadas

### Backend
- ✅ Google OAuth 2.0 completo (login y registro automático)
- ✅ Contraseña mínimo 8 caracteres con letras y números
- ✅ `session_regenerate_id()` para prevenir session fixation
- ✅ `rehash` automático si el algoritmo de bcrypt cambia
- ✅ Transacciones MySQL en votos (previene race conditions)
- ✅ Protección UNIQUE KEY a nivel BD (doble capa anti-doble-voto)
- ✅ Vista `v_ranking` con `RANK()` de SQL
- ✅ Logout completo (destruye sesión del servidor)
- ✅ `activo` en usuarios (podés suspender cuentas)
- ✅ `ultimo_login` actualizado automáticamente
- ✅ Soporte para `avatar_url` de Google
- ✅ `sync_cuentos.php` para poblar la BD desde el JSON

### Frontend
- ✅ Botón "Continuar con Google" funcional
- ✅ Banners de feedback (errores y éxitos)
- ✅ Validación en tiempo real por campo
- ✅ Widget de usuario con avatar/iniciales y botón logout
- ✅ Redirección automática si ya hay sesión activa
- ✅ Flip automático a Login si el email ya está registrado
