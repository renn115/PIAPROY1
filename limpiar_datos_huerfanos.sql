-- Script para eliminar TODOS los datos huérfanos de estudiantes eliminados
-- Ejecutar en Supabase SQL Editor
-- Este script elimina datos huérfanos de CUALQUIER estudiante que haya sido eliminado

-- 1. Eliminar observaciones huérfanas (de cualquier estudiante eliminado)
DELETE FROM public.observaciones
WHERE estudiante_id NOT IN (SELECT id FROM public.estudiantes);

-- 2. Eliminar scoring huérfano (de cualquier estudiante eliminado)
DELETE FROM public.scoring
WHERE estudiante_id NOT IN (SELECT id FROM public.estudiantes);

-- 3. Eliminar comentarios huérfanos (de cualquier estudiante eliminado)
DELETE FROM public.comentarios_orientador
WHERE estudiante_id NOT IN (SELECT id FROM public.estudiantes);

-- 4. Eliminar mejoras huérfanas (de cualquier estudiante eliminado)
DELETE FROM public.mejoras_docente
WHERE estudiante_id NOT IN (SELECT id FROM public.estudiantes);

-- 5. Eliminar respuestas de comentarios huérfanos (comentarios eliminados)
DELETE FROM public.respuestas_comentarios
WHERE comentario_id NOT IN (SELECT id FROM public.comentarios_orientador);

-- 6. Verificar que se eliminaron los datos
SELECT 'Observaciones restantes:' as info, COUNT(*) as total FROM public.observaciones;
SELECT 'Scoring restante:' as info, COUNT(*) as total FROM public.scoring;
SELECT 'Comentarios restantes:' as info, COUNT(*) as total FROM public.comentarios_orientador;
SELECT 'Mejoras restantes:' as info, COUNT(*) as total FROM public.mejoras_docente;
SELECT 'Respuestas restantes:' as info, COUNT(*) as total FROM public.respuestas_comentarios;

-- 7. Verificar estudiantes actuales
SELECT 'Estudiantes actuales:' as info, nombre, grupo FROM public.estudiantes ORDER BY nombre;

-- 8. Mostrar resumen de limpieza
SELECT 
    'Limpieza completada' as estado,
    (SELECT COUNT(*) FROM public.observaciones) as observaciones_validas,
    (SELECT COUNT(*) FROM public.scoring) as scoring_valido,
    (SELECT COUNT(*) FROM public.comentarios_orientador) as comentarios_validos,
    (SELECT COUNT(*) FROM public.mejoras_docente) as mejoras_validas,
    (SELECT COUNT(*) FROM public.estudiantes) as estudiantes_totales;

