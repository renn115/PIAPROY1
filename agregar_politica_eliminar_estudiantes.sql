-- Agregar política RLS para eliminar estudiantes
-- Ejecuta este script en Supabase SQL Editor

-- Política para eliminar estudiantes
drop policy if exists "Todos pueden eliminar estudiantes" on public.estudiantes;
create policy "Todos pueden eliminar estudiantes"
  on public.estudiantes for delete
  using (true);

-- Verificar que la política se creó
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'estudiantes'
order by policyname;

