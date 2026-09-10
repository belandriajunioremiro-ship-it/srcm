-- ============================================================
-- EXTENSIÓN DE USUARIOS (PERFILES) Y MANEJO DE ROLES
-- ============================================================

-- 1. Crear tabla de usuarios (perfiles públicos vinculados a auth.users)
create table usuarios (
  id          uuid primary key references auth.users(id) on delete cascade,
  cedula      text unique not null,
  nombre      text not null,
  apellido    text not null,
  rol         text not null default 'inspector'
              check (rol in ('administrador', 'topografo', 'inspector')),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

alter table usuarios enable row level security;

-- Políticas de lectura/escritura de usuarios
create policy "Usuarios visibles para autenticados" on usuarios
  for select using (auth.role() = 'authenticated');

create policy "Admins pueden gestionar usuarios" on usuarios
  for all using (auth.jwt() ->> 'role' = 'administrador');

create policy "Usuarios pueden actualizar su propio perfil" on usuarios
  for update using (auth.uid() = id);

-- 2. Trigger para insertar el perfil automáticamente al registrarse (SignUp)
-- Supabase auth.signUp({ options: { data: { nombre, apellido, cedula, rol } } }) pasará estos datos
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.usuarios (id, nombre, apellido, cedula, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', 'Sin nombre'),
    coalesce(new.raw_user_meta_data->>'apellido', 'Sin apellido'),
    coalesce(new.raw_user_meta_data->>'cedula', '00000000'),
    coalesce(new.raw_user_meta_data->>'rol', 'inspector')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Asociar el trigger a la tabla de autenticación de Supabase
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- NOTA IMPORTANTE PARA EL HOOK (SI YA ESTABA CREADO EN EL ESQUEMA ANTERIOR):
-- El JWT Hook que inyecta el rol ya lee de raw_user_meta_data ->> 'rol'.
-- Con esto, `auth.jwt() ->> 'role'` funcionará perfectamente.
-- ============================================================
