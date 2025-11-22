-- Script para agregar las columnas edad y entorno_familiar a la tabla estudiantes
-- Si las columnas ya existen, no se agregarán (IF NOT EXISTS no está disponible para ALTER TABLE ADD COLUMN en PostgreSQL)
-- Ejecuta este script en Supabase SQL Editor

-- Agregar columna edad si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'estudiantes' 
        AND column_name = 'edad'
    ) THEN
        ALTER TABLE public.estudiantes ADD COLUMN edad int;
    END IF;
END $$;

-- Agregar columna entorno_familiar si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'estudiantes' 
        AND column_name = 'entorno_familiar'
    ) THEN
        ALTER TABLE public.estudiantes ADD COLUMN entorno_familiar text;
    END IF;
END $$;

-- Verificar que las columnas se agregaron correctamente
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'estudiantes'
  AND column_name IN ('edad', 'entorno_familiar');


