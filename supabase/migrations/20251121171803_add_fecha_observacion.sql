-- Agregar columna fecha_observacion a la tabla observaciones
ALTER TABLE observaciones 
ADD COLUMN IF NOT EXISTS fecha_observacion date;

-- Actualizar registros existentes para que usen created_at como fecha_observacion
UPDATE observaciones 
SET fecha_observacion = created_at::date 
WHERE fecha_observacion IS NULL;

