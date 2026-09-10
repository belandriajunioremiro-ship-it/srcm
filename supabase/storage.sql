-- Crea el bucket para las fotografías de inmuebles (si no existe)
insert into storage.buckets (id, name, public) 
values ('inmuebles', 'inmuebles', true)
on conflict (id) do nothing;

-- Política para que cualquier usuario pueda ver las fotos
create policy "public_read_fotos" on storage.objects 
for select using ( bucket_id = 'inmuebles' );

-- Política para que los usuarios autenticados puedan subir fotos
create policy "auth_upload_fotos" on storage.objects 
for insert with check ( bucket_id = 'inmuebles' and auth.role() = 'authenticated' );
