-- Migración: Sistema de Estados de Casos (CU10)
-- Crea tabla para gestionar estados de seguimiento de casos

-- Crear tabla de casos de seguimiento
CREATE TABLE IF NOT EXISTS public.casos_seguimiento (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  orientador_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  estado text NOT NULL CHECK (estado IN ('abierto', 'en_seguimiento', 'cerrado')) DEFAULT 'abierto',
  observaciones text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- Un solo caso activo por estudiante y orientador
  UNIQUE(estudiante_id, orientador_id)
);

-- Crear índice para optimizar búsquedas
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_estudiante ON public.casos_seguimiento(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_orientador ON public.casos_seguimiento(orientador_id);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_estado ON public.casos_seguimiento(estado);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_created_at ON public.casos_seguimiento(created_at);

-- Habilitar RLS
ALTER TABLE public.casos_seguimiento ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para casos_seguimiento
-- Todos pueden ver casos
DROP POLICY IF EXISTS "Todos pueden ver casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden ver casos_seguimiento"
  ON public.casos_seguimiento FOR SELECT
  USING (true);

-- Todos pueden crear casos
DROP POLICY IF EXISTS "Todos pueden crear casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden crear casos_seguimiento"
  ON public.casos_seguimiento FOR INSERT
  WITH CHECK (true);

-- Todos pueden actualizar casos
DROP POLICY IF EXISTS "Todos pueden actualizar casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden actualizar casos_seguimiento"
  ON public.casos_seguimiento FOR UPDATE
  USING (true);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_casos_seguimiento_updated_at ON public.casos_seguimiento;
CREATE TRIGGER update_casos_seguimiento_updated_at
    BEFORE UPDATE ON public.casos_seguimiento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comentarios de documentación
COMMENT ON TABLE public.casos_seguimiento IS 'Gestión de estados de seguimiento de casos de estudiantes';
COMMENT ON COLUMN public.casos_seguimiento.estado IS 'Estado del caso: abierto, en_seguimiento, cerrado';
COMMENT ON COLUMN public.casos_seguimiento.observaciones IS 'Notas adicionales sobre el cambio de estado';


