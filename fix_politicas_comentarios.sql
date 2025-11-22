-- ============================================================================
-- CORREGIR POLÍTICAS RLS PARA comentarios_orientador
-- ============================================================================
-- Este script elimina las políticas antiguas y crea nuevas que funcionan
-- con autenticación personalizada (sin JWT de Supabase)
-- ============================================================================

-- Paso 1: Eliminar TODAS las políticas existentes (por si hay duplicados)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'comentarios_orientador') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON comentarios_orientador';
    END LOOP;
END $$;

-- Paso 2: Crear nuevas políticas que permitan todas las operaciones
-- (la validación de roles se hace en la aplicación)
CREATE POLICY "Todos pueden ver comentarios"
  ON comentarios_orientador FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear comentarios"
  ON comentarios_orientador FOR INSERT
  WITH CHECK (true);

-- Paso 3: Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comentarios_orientador'
ORDER BY policyname;

