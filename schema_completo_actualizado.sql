-- ============================================================================
-- SCHEMA COMPLETO ACTUALIZADO - Plataforma NeuroEDU
-- Sistema de Detección Temprana de Necesidades Educativas Especiales (NEE)
-- Incluye todas las actualizaciones y nuevas funcionalidades
-- ============================================================================
-- Fecha de actualización: Noviembre 2024
-- Versión: 2.0 (con casos de seguimiento y todas las mejoras)
-- ============================================================================

-- Habilitar extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA 1: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.usuarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL UNIQUE,
  password text NOT NULL,
  nombre text,
  rol text NOT NULL CHECK (rol IN ('docente', 'orientador', 'admin')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 2: estudiantes
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.estudiantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  grupo text,
  edad int,
  entorno_familiar text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 3: observaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.observaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  docente_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  comportamiento text,
  nivel_atencion text NOT NULL CHECK (nivel_atencion IN ('bajo', 'medio', 'alto')),
  interaccion_social int DEFAULT 0,
  seguimiento_instrucciones int DEFAULT 0,
  concentracion int DEFAULT 0,
  fecha_observacion date,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 4: scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.scoring (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  orientador_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  nivel_riesgo text NOT NULL CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
  puntuacion numeric,
  detalles jsonb,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 5: comentarios_orientador
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.comentarios_orientador (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  orientador_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  comentario text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 6: respuestas_comentarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.respuestas_comentarios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  comentario_id uuid NOT NULL REFERENCES public.comentarios_orientador(id) ON DELETE CASCADE,
  usuario_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  respuesta text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 7: mejoras_docente
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.mejoras_docente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_id uuid NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
  docente_id uuid NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  fecha date NOT NULL,
  mejora text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 8: logs_eliminaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.logs_eliminaciones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estudiante_nombre text NOT NULL,
  estudiante_grupo text,
  docente_id uuid REFERENCES public.usuarios(id) ON DELETE SET NULL,
  docente_nombre text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA 9: casos_seguimiento (NUEVA - CU10)
-- ============================================================================
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

-- ============================================================================
-- ÍNDICES PARA OPTIMIZACIÓN
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_observaciones_estudiante ON public.observaciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_observaciones_docente ON public.observaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_scoring_estudiante ON public.scoring(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_estudiante ON public.comentarios_orientador(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_comentarios_orientador ON public.comentarios_orientador(orientador_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_comentario ON public.respuestas_comentarios(comentario_id);
CREATE INDEX IF NOT EXISTS idx_respuestas_usuario ON public.respuestas_comentarios(usuario_id);
CREATE INDEX IF NOT EXISTS idx_mejoras_estudiante ON public.mejoras_docente(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_mejoras_docente ON public.mejoras_docente(docente_id);
CREATE INDEX IF NOT EXISTS idx_mejoras_fecha ON public.mejoras_docente(fecha);
CREATE INDEX IF NOT EXISTS idx_logs_eliminaciones_created_at ON public.logs_eliminaciones(created_at);

-- Índices para casos_seguimiento
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_estudiante ON public.casos_seguimiento(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_orientador ON public.casos_seguimiento(orientador_id);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_estado ON public.casos_seguimiento(estado);
CREATE INDEX IF NOT EXISTS idx_casos_seguimiento_created_at ON public.casos_seguimiento(created_at);

-- ============================================================================
-- FUNCIONES Y TRIGGERS
-- ============================================================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger para actualizar updated_at en casos_seguimiento
DROP TRIGGER IF EXISTS update_casos_seguimiento_updated_at ON public.casos_seguimiento;
CREATE TRIGGER update_casos_seguimiento_updated_at
    BEFORE UPDATE ON public.casos_seguimiento
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estudiantes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.observaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scoring ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comentarios_orientador ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.respuestas_comentarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mejoras_docente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.logs_eliminaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.casos_seguimiento ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- POLÍTICAS RLS PARA usuarios
-- ============================================================================
DROP POLICY IF EXISTS "Todos pueden ver usuarios" ON public.usuarios;
CREATE POLICY "Todos pueden ver usuarios"
  ON public.usuarios FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar usuarios" ON public.usuarios;
CREATE POLICY "Todos pueden insertar usuarios"
  ON public.usuarios FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar usuarios" ON public.usuarios;
CREATE POLICY "Todos pueden actualizar usuarios"
  ON public.usuarios FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Todos pueden eliminar usuarios" ON public.usuarios;
CREATE POLICY "Todos pueden eliminar usuarios"
  ON public.usuarios FOR DELETE
  USING (true);

-- ============================================================================
-- POLÍTICAS RLS PARA estudiantes
-- ============================================================================
DROP POLICY IF EXISTS "Todos pueden ver estudiantes" ON public.estudiantes;
CREATE POLICY "Todos pueden ver estudiantes"
  ON public.estudiantes FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar estudiantes" ON public.estudiantes;
CREATE POLICY "Todos pueden insertar estudiantes"
  ON public.estudiantes FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden eliminar estudiantes" ON public.estudiantes;
CREATE POLICY "Todos pueden eliminar estudiantes"
  ON public.estudiantes FOR DELETE
  USING (true);

-- ============================================================================
-- POLÍTICAS RLS PARA observaciones
-- ============================================================================
DROP POLICY IF EXISTS "Todos pueden ver observaciones" ON public.observaciones;
CREATE POLICY "Todos pueden ver observaciones"
  ON public.observaciones FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar observaciones" ON public.observaciones;
CREATE POLICY "Todos pueden insertar observaciones"
  ON public.observaciones FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA scoring
-- ============================================================================
DROP POLICY IF EXISTS "Todos pueden ver scoring" ON public.scoring;
CREATE POLICY "Todos pueden ver scoring"
  ON public.scoring FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden insertar scoring" ON public.scoring;
CREATE POLICY "Todos pueden insertar scoring"
  ON public.scoring FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA comentarios_orientador
-- ============================================================================
-- Eliminar todas las políticas existentes primero
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comentarios_orientador') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.comentarios_orientador';
    END LOOP;
END $$;

CREATE POLICY "Todos pueden ver comentarios"
  ON public.comentarios_orientador FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear comentarios"
  ON public.comentarios_orientador FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA respuestas_comentarios
-- ============================================================================
-- Eliminar todas las políticas existentes primero
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'respuestas_comentarios') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.respuestas_comentarios';
    END LOOP;
END $$;

CREATE POLICY "Todos pueden ver respuestas"
  ON public.respuestas_comentarios FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear respuestas"
  ON public.respuestas_comentarios FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA mejoras_docente
-- ============================================================================
-- Eliminar todas las políticas existentes primero
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'mejoras_docente') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.mejoras_docente';
    END LOOP;
END $$;

CREATE POLICY "Todos pueden ver mejoras"
  ON public.mejoras_docente FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear mejoras"
  ON public.mejoras_docente FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA logs_eliminaciones
-- ============================================================================
-- Eliminar todas las políticas existentes primero
DO $$
DECLARE
    r record;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'logs_eliminaciones') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.logs_eliminaciones';
    END LOOP;
END $$;

CREATE POLICY "Todos pueden ver logs"
  ON public.logs_eliminaciones FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear logs"
  ON public.logs_eliminaciones FOR INSERT
  WITH CHECK (true);

-- ============================================================================
-- POLÍTICAS RLS PARA casos_seguimiento (NUEVA)
-- ============================================================================
DROP POLICY IF EXISTS "Todos pueden ver casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden ver casos_seguimiento"
  ON public.casos_seguimiento FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Todos pueden crear casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden crear casos_seguimiento"
  ON public.casos_seguimiento FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Todos pueden actualizar casos_seguimiento" ON public.casos_seguimiento;
CREATE POLICY "Todos pueden actualizar casos_seguimiento"
  ON public.casos_seguimiento FOR UPDATE
  USING (true);

-- ============================================================================
-- VISTAS ÚTILES
-- ============================================================================

-- Vista de estudiante con observaciones
DROP VIEW IF EXISTS public.v_estudiante_observaciones;
CREATE OR REPLACE VIEW public.v_estudiante_observaciones AS
SELECT 
  e.id,
  e.nombre,
  e.grupo,
  e.edad,
  e.entorno_familiar,
  e.created_at,
  jsonb_agg(jsonb_build_object(
    'id', o.id,
    'docente_id', o.docente_id,
    'comportamiento', o.comportamiento,
    'nivel_atencion', o.nivel_atencion,
    'interaccion_social', o.interaccion_social,
    'seguimiento_instrucciones', o.seguimiento_instrucciones,
    'concentracion', o.concentracion,
    'fecha_observacion', o.fecha_observacion,
    'created_at', o.created_at
  ) ORDER BY o.created_at DESC) FILTER (WHERE o.id IS NOT NULL) AS observaciones
FROM public.estudiantes e
LEFT JOIN public.observaciones o ON o.estudiante_id = e.id
GROUP BY e.id, e.nombre, e.grupo, e.edad, e.entorno_familiar, e.created_at;

-- ============================================================================
-- DATOS DE PRUEBA (OPCIONAL - Solo para desarrollo)
-- ============================================================================

-- Usuarios de prueba
INSERT INTO public.usuarios (email, password, nombre, rol, activo)
VALUES
  ('admin@example.com', 'admin123', 'Administrador Demo', 'admin', true),
  ('docente@example.com', 'docente123', 'Docente Demo', 'docente', true),
  ('orientador@example.com', 'orientador123', 'Orientador Demo', 'orientador', true)
ON CONFLICT (email) DO NOTHING;

-- Estudiantes de prueba
INSERT INTO public.estudiantes (nombre, grupo, edad, entorno_familiar)
VALUES
  ('Juan Perez', '3A', 8, 'Familia nuclear'),
  ('Maria Lopez', '2B', 7, 'Vive con abuela')
ON CONFLICT DO NOTHING;

-- Observaciones de prueba (usando subqueries para obtener IDs)
INSERT INTO public.observaciones (
  estudiante_id, 
  docente_id, 
  comportamiento, 
  nivel_atencion, 
  interaccion_social, 
  seguimiento_instrucciones, 
  concentracion, 
  fecha_observacion
)
SELECT 
  (SELECT id FROM public.estudiantes WHERE nombre = 'Juan Perez' LIMIT 1),
  (SELECT id FROM public.usuarios WHERE email = 'docente@example.com' LIMIT 1),
  'Muestra distracciones frecuentes en clase',
  'medio',
  3,
  4,
  2,
  CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.observaciones 
  WHERE estudiante_id = (SELECT id FROM public.estudiantes WHERE nombre = 'Juan Perez' LIMIT 1)
  AND comportamiento = 'Muestra distracciones frecuentes en clase'
);

INSERT INTO public.observaciones (
  estudiante_id, 
  docente_id, 
  comportamiento, 
  nivel_atencion, 
  interaccion_social, 
  seguimiento_instrucciones, 
  concentracion, 
  fecha_observacion
)
SELECT 
  (SELECT id FROM public.estudiantes WHERE nombre = 'Maria Lopez' LIMIT 1),
  (SELECT id FROM public.usuarios WHERE email = 'docente@example.com' LIMIT 1),
  'Se distrae con facilidad y responde lento',
  'bajo',
  2,
  2,
  2,
  CURRENT_DATE
WHERE NOT EXISTS (
  SELECT 1 FROM public.observaciones 
  WHERE estudiante_id = (SELECT id FROM public.estudiantes WHERE nombre = 'Maria Lopez' LIMIT 1)
  AND comportamiento = 'Se distrae con facilidad y responde lento'
);

-- Scoring de prueba
INSERT INTO public.scoring (
  estudiante_id, 
  orientador_id, 
  nivel_riesgo, 
  puntuacion, 
  detalles
)
SELECT 
  (SELECT id FROM public.estudiantes WHERE nombre = 'Juan Perez' LIMIT 1),
  (SELECT id FROM public.usuarios WHERE email = 'orientador@example.com' LIMIT 1),
  'medio',
  42.5,
  jsonb_build_object(
    'comentario', 'Requiere seguimiento',
    'atencion_promedio', 3,
    'concentracion_promedio', 2
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.scoring 
  WHERE estudiante_id = (SELECT id FROM public.estudiantes WHERE nombre = 'Juan Perez' LIMIT 1)
);

INSERT INTO public.scoring (
  estudiante_id, 
  orientador_id, 
  nivel_riesgo, 
  puntuacion, 
  detalles
)
SELECT 
  (SELECT id FROM public.estudiantes WHERE nombre = 'Maria Lopez' LIMIT 1),
  (SELECT id FROM public.usuarios WHERE email = 'orientador@example.com' LIMIT 1),
  'alto',
  68.2,
  jsonb_build_object(
    'comentario', 'Alto riesgo - evaluar',
    'atencion_promedio', 2,
    'concentracion_promedio', 2
  )
WHERE NOT EXISTS (
  SELECT 1 FROM public.scoring 
  WHERE estudiante_id = (SELECT id FROM public.estudiantes WHERE nombre = 'Maria Lopez' LIMIT 1)
);

-- ============================================================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================================================

COMMENT ON TABLE public.usuarios IS 'Usuarios del sistema: docentes, orientadores y administradores';
COMMENT ON TABLE public.estudiantes IS 'Estudiantes registrados en el sistema';
COMMENT ON TABLE public.observaciones IS 'Observaciones conductuales registradas por docentes';
COMMENT ON TABLE public.scoring IS 'Evaluaciones de riesgo calculadas por orientadores';
COMMENT ON TABLE public.comentarios_orientador IS 'Comentarios profesionales de orientadores a docentes';
COMMENT ON TABLE public.respuestas_comentarios IS 'Respuestas de docentes a comentarios de orientadores';
COMMENT ON TABLE public.mejoras_docente IS 'Registro de mejoras observadas por docentes';
COMMENT ON TABLE public.logs_eliminaciones IS 'Log de auditoría de estudiantes eliminados';
COMMENT ON TABLE public.casos_seguimiento IS 'Gestión de estados de seguimiento de casos (abierto, en_seguimiento, cerrado)';

COMMENT ON COLUMN public.casos_seguimiento.estado IS 'Estado del caso: abierto, en_seguimiento, cerrado';
COMMENT ON COLUMN public.casos_seguimiento.observaciones IS 'Notas adicionales sobre el cambio de estado';

-- ============================================================================
-- VERIFICACIÓN FINAL
-- ============================================================================

-- Verificar que todas las tablas se crearon correctamente
DO $$
DECLARE
    tablas_esperadas text[] := ARRAY[
        'usuarios', 'estudiantes', 'observaciones', 'scoring',
        'comentarios_orientador', 'respuestas_comentarios',
        'mejoras_docente', 'logs_eliminaciones', 'casos_seguimiento'
    ];
    tabla text;
    existe boolean;
BEGIN
    FOREACH tabla IN ARRAY tablas_esperadas
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = tabla
        ) INTO existe;
        
        IF NOT existe THEN
            RAISE WARNING 'Tabla % no existe', tabla;
        ELSE
            RAISE NOTICE '✓ Tabla % creada correctamente', tabla;
        END IF;
    END LOOP;
END $$;

-- Mostrar resumen de políticas RLS
SELECT 
    'Políticas RLS creadas:' AS info,
    tablename,
    policyname,
    cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN (
      'usuarios', 'estudiantes', 'observaciones', 'scoring',
      'comentarios_orientador', 'respuestas_comentarios',
      'mejoras_docente', 'logs_eliminaciones', 'casos_seguimiento'
  )
ORDER BY tablename, policyname;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
-- Este script crea la base de datos completa con todas las funcionalidades:
-- ✓ 9 tablas principales
-- ✓ Índices optimizados
-- ✓ Row Level Security (RLS) habilitado
-- ✓ Políticas de seguridad configuradas
-- ✓ Triggers para actualización automática
-- ✓ Vista útil para consultas
-- ✓ Datos de prueba (opcional)
-- ============================================================================

