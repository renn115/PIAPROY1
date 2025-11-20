/*
  # Plataforma NEE - Esquema Completo de Base de Datos

  ## Resumen
  Este script crea la estructura completa para la Plataforma Académica de Simulación 
  de Diagnóstico Temprano de NEE (Necesidades Educativas Especiales).

  ## 1. Nuevas Tablas

  ### `usuarios`
  - `id` (uuid, PK): Identificador único
  - `email` (text, unique): Correo institucional
  - `password` (text): Contraseña (hash en producción, simulada aquí)
  - `nombre` (text): Nombre completo
  - `rol` (text): 'docente' | 'orientador' | 'admin'
  - `activo` (boolean): Estado del usuario
  - `created_at` (timestamptz): Fecha de creación

  ### `estudiantes`
  - `id` (uuid, PK): Identificador único
  - `nombre` (text): Nombre del estudiante ficticio
  - `grupo` (text): Grupo/grado (ej: 3A, 2B)
  - `created_at` (timestamptz): Fecha de registro

  ### `observaciones`
  - `id` (uuid, PK): Identificador único
  - `estudiante_id` (uuid, FK): Referencia al estudiante
  - `docente_id` (uuid, FK): Docente que registró
  - `comportamiento` (text): Descripción del comportamiento
  - `nivel_atencion` (text): 'bajo' | 'medio' | 'alto'
  - `interaccion_social` (int): Escala 1-5
  - `seguimiento_instrucciones` (int): Escala 1-5
  - `concentracion` (int): Escala 1-5
  - `created_at` (timestamptz): Fecha de observación

  ### `scoring`
  - `id` (uuid, PK): Identificador único
  - `estudiante_id` (uuid, FK): Referencia al estudiante
  - `orientador_id` (uuid, FK): Orientador que generó el scoring
  - `nivel_riesgo` (text): 'bajo' | 'medio' | 'alto'
  - `puntuacion` (numeric): Puntaje calculado (0-100)
  - `detalles` (jsonb): Desglose del cálculo
  - `created_at` (timestamptz): Fecha de scoring

  ## 2. Seguridad (RLS)
  - Todas las tablas tienen RLS habilitado
  - Políticas restrictivas por rol:
    - Docentes: Ver y crear observaciones
    - Orientadores: Ver observaciones, crear scoring
    - Admin: Acceso completo a usuarios y reportes

  ## 3. Datos de Prueba
  - Usuarios de ejemplo para cada rol
  - Estudiantes ficticios
  - Observaciones de muestra
*/

-- Extensión para UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- TABLA: usuarios
-- ============================================================================
CREATE TABLE IF NOT EXISTS usuarios (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email text UNIQUE NOT NULL,
  password text NOT NULL,
  nombre text NOT NULL,
  rol text NOT NULL CHECK (rol IN ('docente', 'orientador', 'admin')),
  activo boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA: estudiantes
-- ============================================================================
CREATE TABLE IF NOT EXISTS estudiantes (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  nombre text NOT NULL,
  grupo text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA: observaciones
-- ============================================================================
CREATE TABLE IF NOT EXISTS observaciones (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id uuid NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  docente_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  comportamiento text NOT NULL,
  nivel_atencion text NOT NULL CHECK (nivel_atencion IN ('bajo', 'medio', 'alto')),
  interaccion_social int NOT NULL CHECK (interaccion_social BETWEEN 1 AND 5),
  seguimiento_instrucciones int NOT NULL CHECK (seguimiento_instrucciones BETWEEN 1 AND 5),
  concentracion int NOT NULL CHECK (concentracion BETWEEN 1 AND 5),
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- TABLA: scoring
-- ============================================================================
CREATE TABLE IF NOT EXISTS scoring (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  estudiante_id uuid NOT NULL REFERENCES estudiantes(id) ON DELETE CASCADE,
  orientador_id uuid NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  nivel_riesgo text NOT NULL CHECK (nivel_riesgo IN ('bajo', 'medio', 'alto')),
  puntuacion numeric NOT NULL CHECK (puntuacion BETWEEN 0 AND 100),
  detalles jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- ============================================================================
-- ÍNDICES para optimización
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_observaciones_estudiante ON observaciones(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_observaciones_docente ON observaciones(docente_id);
CREATE INDEX IF NOT EXISTS idx_scoring_estudiante ON scoring(estudiante_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_rol ON usuarios(rol);

-- ============================================================================
-- RLS: usuarios
-- ============================================================================
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios pueden ver su propio perfil"
  ON usuarios FOR SELECT
  TO authenticated
  USING (id = (SELECT id FROM usuarios WHERE email = auth.jwt()->>'email'));

CREATE POLICY "Admin puede ver todos los usuarios"
  ON usuarios FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol = 'admin'
    )
  );

CREATE POLICY "Admin puede insertar usuarios"
  ON usuarios FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol = 'admin'
    )
  );

CREATE POLICY "Admin puede actualizar usuarios"
  ON usuarios FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol = 'admin'
    )
  );

-- ============================================================================
-- RLS: estudiantes
-- ============================================================================
ALTER TABLE estudiantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver estudiantes"
  ON estudiantes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Docentes pueden crear estudiantes"
  ON estudiantes FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol IN ('docente', 'admin')
    )
  );

-- ============================================================================
-- RLS: observaciones
-- ============================================================================
ALTER TABLE observaciones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver observaciones"
  ON observaciones FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Docentes pueden crear observaciones"
  ON observaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol IN ('docente', 'admin')
    )
  );

-- ============================================================================
-- RLS: scoring
-- ============================================================================
ALTER TABLE scoring ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios autenticados pueden ver scoring"
  ON scoring FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Orientadores pueden crear scoring"
  ON scoring FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE email = auth.jwt()->>'email'
      AND rol IN ('orientador', 'admin')
    )
  );

-- ============================================================================
-- DATOS DE PRUEBA
-- ============================================================================

-- Usuarios de prueba (contraseñas: "password123")
INSERT INTO usuarios (email, password, nombre, rol) VALUES
  ('docente@test.com', 'password123', 'Prof. María González', 'docente'),
  ('orientador@test.com', 'password123', 'Lic. Carlos Ramírez', 'orientador'),
  ('admin@test.com', 'password123', 'Administrador Sistema', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Estudiantes ficticios
INSERT INTO estudiantes (nombre, grupo) VALUES
  ('Estudiante Alfa', '3A'),
  ('Estudiante Beta', '2B'),
  ('Estudiante Gamma', '1C'),
  ('Estudiante Delta', '3A'),
  ('Estudiante Epsilon', '2B')
ON CONFLICT DO NOTHING;

-- Observaciones de muestra
INSERT INTO observaciones (
  estudiante_id,
  docente_id,
  comportamiento,
  nivel_atencion,
  interaccion_social,
  seguimiento_instrucciones,
  concentracion
)
SELECT
  e.id,
  u.id,
  'Presenta dificultad para mantener atención en tareas prolongadas. Se distrae fácilmente con estímulos externos.',
  'bajo',
  2,
  2,
  1
FROM estudiantes e
CROSS JOIN usuarios u
WHERE e.nombre = 'Estudiante Alfa' AND u.rol = 'docente'
LIMIT 1;

INSERT INTO observaciones (
  estudiante_id,
  docente_id,
  comportamiento,
  nivel_atencion,
  interaccion_social,
  seguimiento_instrucciones,
  concentracion
)
SELECT
  e.id,
  u.id,
  'Buen desempeño general. Participa activamente en clase y sigue instrucciones adecuadamente.',
  'alto',
  5,
  4,
  5
FROM estudiantes e
CROSS JOIN usuarios u
WHERE e.nombre = 'Estudiante Beta' AND u.rol = 'docente'
LIMIT 1;

INSERT INTO observaciones (
  estudiante_id,
  docente_id,
  comportamiento,
  nivel_atencion,
  interaccion_social,
  seguimiento_instrucciones,
  concentracion
)
SELECT
  e.id,
  u.id,
  'Nivel medio de atención. A veces requiere recordatorios para completar tareas.',
  'medio',
  3,
  3,
  3
FROM estudiantes e
CROSS JOIN usuarios u
WHERE e.nombre = 'Estudiante Gamma' AND u.rol = 'docente'
LIMIT 1;