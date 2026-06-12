-- =============================================
--  schema.sql — Pequeñas Historias Grandes Valores
--  Base de datos optimizada con soporte OAuth
-- =============================================

SET NAMES utf8mb4;
SET time_zone = '-04:00';  -- Bolivia UTC-4

CREATE DATABASE IF NOT EXISTS phgv_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE phgv_db;

-- ── Tabla de usuarios ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    nombre        VARCHAR(80)     NOT NULL,
    email         VARCHAR(180)    NOT NULL,

    -- Auth local (opcional si el usuario entró con Google)
    password_hash VARCHAR(255)    NULL,

    -- OAuth Google
    google_id     VARCHAR(128)    NULL,           -- sub del token de Google
    avatar_url    VARCHAR(500)    NULL,            -- foto de perfil de Google

    -- Meta
    telefono      VARCHAR(20)     NULL,
    activo        TINYINT(1)      NOT NULL DEFAULT 1,
    creado_en     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ultimo_login  DATETIME        NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_email     (email),
    UNIQUE KEY uq_google_id (google_id),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabla de cuentos ──────────────────────────────────────────────────────────
--   json_id = ID del objeto en cuentos.json (para compatibilidad)
CREATE TABLE IF NOT EXISTS cuentos (
    id            INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    json_id       INT UNSIGNED    NOT NULL,        -- coincide con cuentos.json .id
    titulo        VARCHAR(200)    NOT NULL,
    autor         VARCHAR(120)    NOT NULL,
    colegio       VARCHAR(150)    NULL,
    fecha         DATE            NULL,
    descripcion   TEXT            NULL,
    cover         VARCHAR(20)     NULL,            -- color hex
    cover_text    VARCHAR(200)    NULL,
    votos         INT UNSIGNED    NOT NULL DEFAULT 0,
    activo        TINYINT(1)      NOT NULL DEFAULT 1,
    creado_en     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_json_id (json_id),
    INDEX idx_votos  (votos DESC),
    INDEX idx_activo (activo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabla de votos ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS votos (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED    NOT NULL,
    cuento_id   INT UNSIGNED    NOT NULL,          -- FK a cuentos.id
    votado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id),
    UNIQUE KEY uq_usuario_voto (usuario_id),       -- 1 voto por usuario
    INDEX idx_cuento (cuento_id),
    CONSTRAINT fk_votos_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_votos_cuento  FOREIGN KEY (cuento_id)
        REFERENCES cuentos  (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Tabla de sesiones (tokens JWT-like para mayor seguridad) ──────────────────
CREATE TABLE IF NOT EXISTS sesiones (
    id          INT UNSIGNED    NOT NULL AUTO_INCREMENT,
    usuario_id  INT UNSIGNED    NOT NULL,
    token       CHAR(64)        NOT NULL,          -- SHA-256 hex del token
    expira_en   DATETIME        NOT NULL,
    creado_en   DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ip          VARCHAR(45)     NULL,
    user_agent  VARCHAR(255)    NULL,

    PRIMARY KEY (id),
    UNIQUE KEY uq_token (token),
    INDEX idx_usuario   (usuario_id),
    INDEX idx_expira    (expira_en),
    CONSTRAINT fk_sesiones_usuario FOREIGN KEY (usuario_id)
        REFERENCES usuarios (id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ── Vista: ranking público ────────────────────────────────────────────────────
CREATE OR REPLACE VIEW v_ranking AS
SELECT
    c.json_id                               AS id,
    c.titulo                                AS title,
    c.autor                                 AS author,
    c.colegio                               AS school,
    c.fecha                                 AS date,
    c.descripcion                           AS `desc`,
    c.cover,
    c.cover_text                            AS coverText,
    c.votos                                 AS votes,
    RANK() OVER (ORDER BY c.votos DESC)     AS posicion
FROM cuentos c
WHERE c.activo = 1
ORDER BY c.votos DESC, c.titulo ASC;

-- ── Procedimiento: sincronizar cuentos desde JSON (llamar 1 vez) ──────────────
-- Usar desde PHP con INSERT ... ON DUPLICATE KEY UPDATE

-- ── Limpieza automática de sesiones expiradas (evento) ───────────────────────
CREATE EVENT IF NOT EXISTS limpiar_sesiones
    ON SCHEDULE EVERY 1 DAY
    DO DELETE FROM sesiones WHERE expira_en < NOW();
