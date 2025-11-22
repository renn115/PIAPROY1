-- ============================================================================
-- TABLA: comentarios_orientador
-- ============================================================================
-- Permite a los orientadores dejar comentarios sobre casos de estudiantes
-- que luego serán visibles para los docentes
-- ============================================================================

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

