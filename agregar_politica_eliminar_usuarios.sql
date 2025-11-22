-- Agregar política RLS para permitir eliminar usuarios
-- Ejecutar este script en Supabase SQL Editor

-- Eliminar política existente si existe
drop policy if exists "Todos pueden eliminar usuarios" on public.usuarios;

-- Crear política para eliminar usuarios
create policy "Todos pueden eliminar usuarios"
  on public.usuarios for delete
  using (true);


