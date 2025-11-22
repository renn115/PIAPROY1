-- ============================================================================
-- TABLA: respuestas_comentarios
-- ============================================================================
-- Permite conversaciones bidireccionales entre orientadores y docentes
-- ============================================================================

CREATE TABLE IF NOT EXISTS respuestas_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id uuid NOT NULL REFERENCES comentarios_orientador(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  respuesta text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_respuestas_comentario ON respuestas_comentarios(comentario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_usuario ON respuestas_comentarios(usuario_id);

-- ============================================================================
-- TABLA: mejoras_docente
-- ============================================================================
-- Permite a los docentes registrar mejoras por fecha para cada estudiante
-- ============================================================================

CREATE TABLE IF NOT EXISTS mejoras_docente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  docente_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  mejora text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Índices para optimización
CREATE INDEX IF NOT EXISTS idx_mejoras_estudiante ON mejoras_docente(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_mejoras_docente ON mejoras_docente(docente_id);
CREATE INDEX IF NOT EXISTS idx_mejoras_fecha ON mejoras_docente(fecha);

-- ============================================================================
-- RLS: respuestas_comentarios
-- ============================================================================
ALTER TABLE respuestas_comentarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver respuestas"
  ON respuestas_comentarios FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear respuestas"
  ON respuestas_comentarios FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- RLS: mejoras_docente
-- ============================================================================
ALTER TABLE mejoras_docente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos pueden ver mejoras"
  ON mejoras_docente FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear mejoras"
  ON mejoras_docente FOR INSERT
  WITH CHECK (true);

