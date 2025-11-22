-- Supabase schema for NEE Early Diagnosis Simulation Platform
-- Run this in Supabase SQL Editor (SQL -> New query), then click Run.
-- NOTE: For development only. Contains sample users with plaintext passwords (insecure).
-- Replace with proper auth and password hashing for production.

-- Enable pgcrypto for gen_random_uuid()
create extension if not exists "pgcrypto";

-- 1) usuarios
create table if not exists public.usuarios (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  password text not null,
  nombre text,
  rol text not null check (rol in ('docente','orientador','admin')),
  activo boolean default true,
  created_at timestamptz default now()
);

-- 2) estudiantes
create table if not exists public.estudiantes (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  grupo text,
  created_at timestamptz default now()
);

-- 3) observaciones
create table if not exists public.observaciones (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  docente_id uuid references public.usuarios(id) on delete set null,
  comportamiento text,
  nivel_atencion text not null check (nivel_atencion in ('bajo','medio','alto')),
  interaccion_social int default 0,
  seguimiento_instrucciones int default 0,
  concentracion int default 0,
  fecha_observacion date,
  created_at timestamptz default now()
);

-- 4) scoring
create table if not exists public.scoring (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  orientador_id uuid references public.usuarios(id) on delete set null,
  nivel_riesgo text not null check (nivel_riesgo in ('bajo','medio','alto')),
  puntuacion numeric,
  detalles jsonb,
  created_at timestamptz default now()
);

-- 5) comentarios_orientador
create table if not exists public.comentarios_orientador (
  id uuid primary key default gen_random_uuid(),
  estudiante_id uuid not null references public.estudiantes(id) on delete cascade,
  orientador_id uuid not null references public.usuarios(id) on delete cascade,
  comentario text not null,
  created_at timestamptz default now()
);

-- Índices para optimización
create index if not exists idx_observaciones_estudiante on public.observaciones(estudiante_id);
create index if not exists idx_observaciones_docente on public.observaciones(docente_id);
create index if not exists idx_scoring_estudiante on public.scoring(estudiante_id);
create index if not exists idx_comentarios_estudiante on public.comentarios_orientador(estudiante_id);
create index if not exists idx_comentarios_orientador on public.comentarios_orientador(orientador_id);

-- Sample data (development/demo)
-- WARNING: Passwords are plaintext for demo only.
insert into public.usuarios (email, password, nombre, rol, activo)
values
('admin@example.com', 'admin123', 'Administrador Demo', 'admin', true)
on conflict (email) do nothing;

insert into public.usuarios (email, password, nombre, rol, activo)
values
('docente@example.com', 'docente123', 'Docente Demo', 'docente', true)
on conflict (email) do nothing;

insert into public.usuarios (email, password, nombre, rol, activo)
values
('orientador@example.com', 'orientador123', 'Orientador Demo', 'orientador', true)
on conflict (email) do nothing;

-- Sample students
insert into public.estudiantes (nombre, grupo)
values
('Juan Perez', '3A'),
('Maria Lopez', '2B')
on conflict do nothing;

-- Link sample observations (we need to get ids from users and students)
-- We'll insert using subqueries to fetch ids.

insert into public.observaciones (estudiante_id, docente_id, comportamiento, nivel_atencion, interaccion_social, seguimiento_instrucciones, concentracion, fecha_observacion)
values
(
  (select id from public.estudiantes where nombre = 'Juan Perez' limit 1),
  (select id from public.usuarios where email = 'docente@example.com' limit 1),
  'Muestra distracciones frecuentes en clase',
  'medio',
  3,
  4,
  2,
  current_date
),
(
  (select id from public.estudiantes where nombre = 'Maria Lopez' limit 1),
  (select id from public.usuarios where email = 'docente@example.com' limit 1),
  'Se distrae con facilidad y responde lento',
  'bajo',
  2,
  2,
  2,
  current_date
)
on conflict do nothing;

-- Sample scoring entries
insert into public.scoring (estudiante_id, orientador_id, nivel_riesgo, puntuacion, detalles)
values
(
  (select id from public.estudiantes where nombre = 'Juan Perez' limit 1),
  (select id from public.usuarios where email = 'orientador@example.com' limit 1),
  'medio',
  42.5,
  jsonb_build_object('comentario','Requiere seguimiento', 'atencion_promedio', 3, 'concentracion_promedio', 2)
),
(
  (select id from public.estudiantes where nombre = 'Maria Lopez' limit 1),
  (select id from public.usuarios where email = 'orientador@example.com' limit 1),
  'alto',
  68.2,
  jsonb_build_object('comentario','Alto riesgo - evaluar', 'atencion_promedio', 2, 'concentracion_promedio', 2)
)
on conflict do nothing;

-- Helpful views (optional) to simplify queries
create or replace view public.v_estudiante_observaciones as
select e.*, jsonb_agg(jsonb_build_object(
  'id', o.id,
  'docente_id', o.docente_id,
  'comportamiento', o.comportamiento,
  'nivel_atencion', o.nivel_atencion,
  'interaccion_social', o.interaccion_social,
  'seguimiento_instrucciones', o.seguimiento_instrucciones,
  'concentracion', o.concentracion,
  'fecha_observacion', o.fecha_observacion,
  'created_at', o.created_at
) order by o.created_at desc) as observaciones
from public.estudiantes e
left join public.observaciones o on o.estudiante_id = e.id
group by e.id;

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Políticas corregidas para autenticación personalizada
-- ============================================================================

-- Habilitar RLS en todas las tablas
alter table public.usuarios enable row level security;
alter table public.estudiantes enable row level security;
alter table public.observaciones enable row level security;
alter table public.scoring enable row level security;
alter table public.comentarios_orientador enable row level security;

-- Políticas para usuarios (la validación de roles se hace en la aplicación)
drop policy if exists "Todos pueden ver usuarios" on public.usuarios;
create policy "Todos pueden ver usuarios"
  on public.usuarios for select
  using (true);

drop policy if exists "Todos pueden insertar usuarios" on public.usuarios;
create policy "Todos pueden insertar usuarios"
  on public.usuarios for insert
  with check (true);

drop policy if exists "Todos pueden actualizar usuarios" on public.usuarios;
create policy "Todos pueden actualizar usuarios"
  on public.usuarios for update
  using (true);

-- Políticas para estudiantes
drop policy if exists "Todos pueden ver estudiantes" on public.estudiantes;
create policy "Todos pueden ver estudiantes"
  on public.estudiantes for select
  using (true);

drop policy if exists "Todos pueden insertar estudiantes" on public.estudiantes;
create policy "Todos pueden insertar estudiantes"
  on public.estudiantes for insert
  with check (true);

-- Políticas para observaciones
drop policy if exists "Todos pueden ver observaciones" on public.observaciones;
create policy "Todos pueden ver observaciones"
  on public.observaciones for select
  using (true);

drop policy if exists "Todos pueden insertar observaciones" on public.observaciones;
create policy "Todos pueden insertar observaciones"
  on public.observaciones for insert
  with check (true);

-- Políticas para scoring
drop policy if exists "Todos pueden ver scoring" on public.scoring;
create policy "Todos pueden ver scoring"
  on public.scoring for select
  using (true);

drop policy if exists "Todos pueden insertar scoring" on public.scoring;
create policy "Todos pueden insertar scoring"
  on public.scoring for insert
  with check (true);

-- Políticas para comentarios_orientador (CORREGIDAS)
-- Eliminar todas las políticas existentes primero
do $$
declare
    r record;
begin
    for r in (select policyname from pg_policies where tablename = 'comentarios_orientador') loop
        execute 'drop policy if exists "' || r.policyname || '" on public.comentarios_orientador';
    end loop;
end $$;

-- Crear nuevas políticas que funcionan con autenticación personalizada
create policy "Todos pueden ver comentarios"
  on public.comentarios_orientador for select
  using (true);

create policy "Todos pueden crear comentarios"
  on public.comentarios_orientador for insert
  with check (true);

-- Verificar que todo se creó correctamente
select 'Tablas creadas:' as info;
select table_name 
from information_schema.tables 
where table_schema = 'public' 
  and table_name in ('usuarios', 'estudiantes', 'observaciones', 'scoring', 'comentarios_orientador')
order by table_name;

select 'Políticas RLS creadas:' as info;
select tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('usuarios', 'estudiantes', 'observaciones', 'scoring', 'comentarios_orientador')
order by tablename, policyname;

-- End of SQL

