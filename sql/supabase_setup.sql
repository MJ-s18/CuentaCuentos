-- =========================================================================
--  supabase_setup.sql — Pequeñas Historias Grandes Valores
--  Copia y pega este script en el editor SQL de tu panel de Supabase
-- =========================================================================

-- 1. Crear la tabla de votos
CREATE TABLE IF NOT EXISTS public.votos (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    cuento_id INTEGER NOT NULL,
    votado_en TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    
    -- Restricción UNIQUE para asegurar que un usuario solo pueda tener un registro (1 voto)
    CONSTRAINT uq_usuario_voto UNIQUE (usuario_id)
);

-- 2. Habilitar la seguridad a nivel de fila (Row Level Security - RLS)
ALTER TABLE public.votos ENABLE ROW LEVEL SECURITY;

-- 3. Crear política para que cualquier persona (público) pueda ver los votos
CREATE POLICY "Permitir lectura pública de votos" 
ON public.votos FOR SELECT 
USING (true);

-- 4. Crear política para que solo usuarios logueados puedan votar y solo en su propio nombre
CREATE POLICY "Permitir votar solo a usuarios autenticados" 
ON public.votos FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = usuario_id);

-- =========================================================================
--  ¡Listo! Con esto tu base de datos está configurada y protegida.
-- =========================================================================
