-- ============================================================================
-- MIGRACIÓN: Crear tabla comentarios_orientador
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ve al Dashboard de Supabase: https://app.supabase.com
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Copia y pega este script completo
-- 5. Haz clic en "Run" o presiona Ctrl+Enter
-- ============================================================================

-- Crear tabla comentarios_orientador
CREATE TABLE IF NOT EXISTS comentarios_orientador (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id uuid NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  orientador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_comentarios_estudiante ON comentarios_orientador(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_orientador ON comentarios_orientador(orientador_id);

-- ============================================================================
-- RLS: comentarios_orientador
-- ============================================================================
ALTER TABLE comentarios_orientador ENABLE ROW LEVEL SECURITY;

-- Permitir ver todos los comentarios (la validación de rol se hace en la aplicación)
CREATE POLICY "Todos pueden ver comentarios"
  ON comentarios_orientador FOR SELECT
  USING (true);

-- Permitir crear comentarios (la validación de rol se hace en la aplicación)
CREATE POLICY "Todos pueden crear comentarios"
  ON comentarios_orientador FOR INSERT
  WITH CHECK (true);

-- Verificar que la tabla se creó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'comentarios_orientador'
ORDER BY ordinal_position;

