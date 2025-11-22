-- ============================================================================
-- MIGRACIÓN: Agregar campo fecha_observacion a la tabla observaciones
-- ============================================================================
-- INSTRUCCIONES:
-- 1. Ve al Dashboard de Supabase: https://app.supabase.com
-- 2. Selecciona tu proyecto
-- 3. Ve a "SQL Editor" en el menú lateral
-- 4. Copia y pega este script completo
-- 5. Haz clic en "Run" o presiona Ctrl+Enter
-- ============================================================================

-- Agregar columna fecha_observacion a la tabla observaciones
ALTER TABLE observaciones 
ADD COLUMN IF NOT EXISTS fecha_observacion date;

-- Actualizar registros existentes para que usen created_at como fecha_observacion
UPDATE observaciones 
SET fecha_observacion = created_at::date 
WHERE fecha_observacion IS NULL;

-- Verificar que la columna se creó correctamente
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'observaciones' 
AND column_name = 'fecha_observacion';

