-- ============================================================================
-- ACTUALIZAR POLÍTICAS RLS PARA comentarios_orientador
-- ============================================================================
-- Este script actualiza las políticas RLS para que funcionen con
-- autenticación personalizada (sin JWT de Supabase)
-- ============================================================================

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Usuarios autenticados pueden ver comentarios" ON comentarios_orientador;
DROP POLICY IF EXISTS "Orientadores pueden crear comentarios" ON comentarios_orientador;

-- Crear nuevas políticas que permitan todas las operaciones
-- (la validación de roles se hace en la aplicación)
CREATE POLICY "Todos pueden ver comentarios"
  ON comentarios_orientador FOR SELECT
  USING (true);

CREATE POLICY "Todos pueden crear comentarios"
  ON comentarios_orientador FOR INSERT
  WITH CHECK (true);

-- Verificar que las políticas se crearon correctamente
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'comentarios_orientador';

