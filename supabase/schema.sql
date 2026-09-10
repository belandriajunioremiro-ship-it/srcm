-- ============================================================
-- SRCM — Sistema de Registro Catastral Municipal
-- Municipio Torbes, San Josecito, Estado Táchira
-- Base de datos: Supabase (PostgreSQL + PostGIS)
-- ============================================================

-- ============================================================
-- 1. EXTENSIÓN GEOESPACIAL
-- ============================================================
create extension if not exists postgis;

-- ============================================================
-- 2. SECUENCIA para código catastral (evita colisiones)
-- ============================================================
create sequence if not exists seq_codigo_catastral start 1;

-- ============================================================
-- 3. TABLAS
-- ============================================================
create table propietarios (
  id          uuid primary key default gen_random_uuid(),
  cedula      text unique not null,
  nombre      text not null,
  apellido    text not null,
  telefono    text,
  email       text,
  direccion   text,
  created_at  timestamptz default now()
);

create table inmuebles (
  id               uuid primary key default gen_random_uuid(),
  codigo_catastral text unique not null,
  direccion        text not null,
  barrio           text,
  zona             text,
  tipo_inmueble    text not null default 'residencial'
                   check (tipo_inmueble in ('residencial','comercial','industrial','rural','mixto')),
  superficie_m2    numeric(12,2),           -- valor declarado/medido en campo
  superficie_gis_m2 numeric(12,2) generated always as (ST_Area(geom::geography)) stored, -- fuente de verdad
  perimetro_gis_m  numeric(12,2) generated always as (ST_Perimeter(geom::geography)) stored,
  norte text, sur text, este text, oeste text,
  geom             geometry(Polygon, 4326) not null,   -- WGS84 (EPSG:4326)
  registrado_por   uuid references auth.users(id),
  estado_sync      text not null default 'synced'
                   check (estado_sync in ('pendiente','synced','conflicto')),
  created_at       timestamptz default now(),
  updated_at       timestamptz default now()
);

create table fotos_inmueble (
  id          uuid primary key default gen_random_uuid(),
  inmueble_id uuid not null references inmuebles(id) on delete cascade,
  url         text not null,
  descripcion text,
  created_at  timestamptz default now()
);

-- Hitos: puntos de referencia física sobre un vértice del polígono
create table hitos_prediales (
  id             uuid primary key default gen_random_uuid(),
  inmueble_id    uuid not null references inmuebles(id) on delete cascade,
  indice_vertice integer not null,
  descripcion    text not null,
  lat            numeric(10,7) not null,
  lon            numeric(10,7) not null,
  foto_url       text,
  created_at     timestamptz default now()
);

-- ============================================================
-- 4. ÍNDICES
-- ============================================================
create index idx_inmuebles_geom   on inmuebles using gist (geom);
create index idx_inmuebles_barrio on inmuebles (barrio);
create index idx_inmuebles_zona   on inmuebles (zona);
create index idx_fotos_inmueble   on fotos_inmueble (inmueble_id);
create index idx_hitos_inmueble   on hitos_prediales (inmueble_id);

-- ============================================================
-- 5. TRIGGER updated_at
-- ============================================================
create or replace function set_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end;
$$ language plpgsql;

create trigger trg_inmuebles_updated before update on inmuebles
for each row execute function set_updated_at();

-- ============================================================
-- 6. ROW LEVEL SECURITY
-- ============================================================
alter table propietarios   enable row level security;
alter table inmuebles      enable row level security;
alter table fotos_inmueble enable row level security;

create policy "select autenticados" on inmuebles for select using (auth.role() = 'authenticated');
create policy "insert autenticados" on inmuebles for insert with check (auth.role() = 'authenticated');
create policy "update autenticados" on inmuebles for update using (auth.role() = 'authenticated');
create policy "delete admin" on inmuebles for delete using (auth.jwt() ->> 'role' = 'administrador');

create policy "crud propietarios" on propietarios   for all using (auth.role() = 'authenticated');
create policy "crud fotos"        on fotos_inmueble  for all using (auth.role() = 'authenticated');
create policy "crud hitos"        on hitos_prediales for all using (auth.role() = 'authenticated');

-- ============================================================
-- 6.1 AUTH HOOK — custom access token
-- ============================================================
create or replace function public.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql
as $$
declare
  claims jsonb;
  rol    text;
begin
  select raw_user_meta_data ->> 'rol' into rol
  from auth.users where id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{role}', to_jsonb(coalesce(rol, 'inspector')));
  event := jsonb_set(event, '{claims}', claims);
  return event;
end;
$$;

-- ============================================================
-- 7. RPC: generar código catastral sin colisiones
-- ============================================================
create or replace function generar_codigo_catastral(p_zona text default '01', p_barrio text default '00')
returns text as $$
  select p_zona || '-' || p_barrio || '-' ||
         lpad(nextval('seq_codigo_catastral')::text, 6, '0');
$$ language sql;

-- ============================================================
-- 8. RPC: insertar inmueble
-- ============================================================
create or replace function insertar_inmueble(
  p_codigo text, p_direccion text, p_barrio text, p_zona text,
  p_tipo text, p_superficie numeric,
  p_norte text, p_sur text, p_este text, p_oeste text,
  p_geom jsonb
) returns uuid as $$
declare v_id uuid;
begin
  insert into inmuebles (
    codigo_catastral, direccion, barrio, zona, tipo_inmueble, superficie_m2,
    norte, sur, este, oeste, geom, registrado_por
  ) values (
    p_codigo, p_direccion, p_barrio, p_zona, p_tipo, p_superficie,
    p_norte, p_sur, p_este, p_oeste,
    ST_GeomFromGeoJSON(p_geom)::geometry(Polygon, 4326),
    auth.uid()
  ) returning id into v_id;
  return v_id;
exception when unique_violation then
  raise exception 'codigo_duplicado' using errcode = '23505';
end;
$$ language plpgsql security definer;

-- ============================================================
-- 9. RPC: mapa catastral completo (GeoJSON)
-- ============================================================
create or replace function mapa_catastral()
returns jsonb as $$
  select jsonb_build_object(
    'type', 'FeatureCollection',
    'features', coalesce(jsonb_agg(jsonb_build_object(
      'type', 'Feature',
      'geometry',  ST_AsGeoJSON(geom)::jsonb,
      'properties', jsonb_build_object(
        'id', id, 'codigo', codigo_catastral, 'direccion', direccion,
        'barrio', barrio, 'zona', zona, 'tipo', tipo_inmueble,
        'superficie', superficie_gis_m2
      )
    )), '[]'::jsonb)
  )
  from inmuebles;
$$ language sql stable;

-- ============================================================
-- 10. RPC: estadísticas
-- ============================================================
create or replace function estadisticas_catastro()
returns jsonb as $$
  select jsonb_build_object(
    'total_predios', count(*),
    'superficie_total_m2', coalesce(sum(superficie_gis_m2), 0),
    'por_tipo', (select jsonb_object_agg(tipo_inmueble, n)
                 from (select tipo_inmueble, count(*) n from inmuebles group by 1) t),
    'por_zona', (select jsonb_object_agg(coalesce(zona,'Sin zona'), n)
                 from (select zona, count(*) n from inmuebles group by 1) z)
  ) from inmuebles;
$$ language sql stable;

-- ============================================================
-- 11. RPC: predios por barrio (ranking)
-- ============================================================
create or replace function predios_por_barrio()
returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'barrio', coalesce(barrio, 'Sin barrio'), 'predios', n, 'superficie_m2', sup
  ) order by n desc), '[]'::jsonb)
  from (
    select barrio, count(*) n, sum(superficie_gis_m2) sup
    from inmuebles group by barrio
  ) t;
$$ language sql stable;

-- ============================================================
-- 12. COPROPIEDAD: un predio puede tener 2 o más propietarios
-- ============================================================
create table predio_propietarios (
  id                    uuid primary key default gen_random_uuid(),
  inmueble_id           uuid not null references inmuebles(id) on delete cascade,
  propietario_id        uuid not null references propietarios(id) on delete restrict,
  porcentaje_propiedad  numeric(5,2) not null check (porcentaje_propiedad > 0 and porcentaje_propiedad <= 100),
  tipo_tenencia         text not null default 'pleno_dominio'
                        check (tipo_tenencia in ('pleno_dominio','proindiviso','sucesion','usufructo','ocupante')),
  fecha_inicio          date not null default current_date,
  fecha_fin             date,
  documento_soporte     text,
  created_at            timestamptz default now()
);

create index idx_predio_propietarios_inmueble    on predio_propietarios(inmueble_id);
create index idx_predio_propietarios_propietario on predio_propietarios(propietario_id);
create unique index idx_predio_propietario_vigente
  on predio_propietarios(inmueble_id, propietario_id) where (fecha_fin is null);

alter table predio_propietarios enable row level security;
create policy "crud copropietarios" on predio_propietarios for all using (auth.role() = 'authenticated');

-- Valida que la suma de % vigentes nunca pase de 100%
create or replace function validar_porcentaje_copropiedad()
returns trigger as $$
declare total numeric;
begin
  select coalesce(sum(porcentaje_propiedad), 0) into total
  from predio_propietarios
  where inmueble_id = new.inmueble_id and fecha_fin is null and id <> coalesce(new.id, gen_random_uuid());

  if total + new.porcentaje_propiedad > 100.01 then
    raise exception 'suma_porcentaje_excede_100: el predio ya tiene % asignado', total;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_validar_copropiedad
  before insert or update on predio_propietarios
  for each row execute function validar_porcentaje_copropiedad();

-- RPC: registra copropietarios atómicamente
create or replace function registrar_copropietarios(p_inmueble_id uuid, p_propietarios jsonb)
returns void as $$
declare item jsonb;
begin
  update predio_propietarios set fecha_fin = current_date
  where inmueble_id = p_inmueble_id and fecha_fin is null;

  for item in select * from jsonb_array_elements(p_propietarios) loop
    insert into predio_propietarios (inmueble_id, propietario_id, porcentaje_propiedad, tipo_tenencia)
    values (
      p_inmueble_id,
      (item->>'propietario_id')::uuid,
      (item->>'porcentaje')::numeric,
      coalesce(item->>'tipo_tenencia', 'pleno_dominio')
    );
  end loop;
end;
$$ language plpgsql security definer;

-- Vista: copropietarios vigentes
create or replace view v_copropietarios_actuales as
select pp.inmueble_id, pp.porcentaje_propiedad, pp.tipo_tenencia, pp.fecha_inicio,
       p.id as propietario_id, p.cedula, p.nombre, p.apellido, p.telefono
from predio_propietarios pp
join propietarios p on p.id = pp.propietario_id
where pp.fecha_fin is null;

-- ============================================================
-- 13. VALIDACIÓN DE TOPOLOGÍA: evita predios solapados
-- ============================================================
create or replace function prevenir_solape_predios()
returns trigger as $$
declare conflicto record;
begin
  select codigo_catastral, ST_Area(ST_Intersection(new.geom, geom)::geography) as area_solape
  into conflicto
  from inmuebles
  where id <> coalesce(new.id, gen_random_uuid())
    and ST_Intersects(geom, new.geom)
  order by area_solape desc
  limit 1;

  if conflicto.area_solape is not null and conflicto.area_solape > 1 then
    raise exception 'solape_topologico: el polígono se superpone % m² con el predio %',
      round(conflicto.area_solape::numeric, 1), conflicto.codigo_catastral;
  end if;
  return new;
end;
$$ language plpgsql;

create trigger trg_prevenir_solape
  before insert or update of geom on inmuebles
  for each row execute function prevenir_solape_predios();

-- RPC: detectar solapamientos existentes
create or replace function detectar_solapamientos()
returns jsonb as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'predio_a', a.codigo_catastral, 'predio_b', b.codigo_catastral,
    'area_solape_m2', round(ST_Area(ST_Intersection(a.geom, b.geom)::geography)::numeric, 1)
  )), '[]'::jsonb)
  from inmuebles a
  join inmuebles b on a.id < b.id and ST_Intersects(a.geom, b.geom)
  where ST_Area(ST_Intersection(a.geom, b.geom)::geography) > 1;
$$ language sql stable;

-- ============================================================
-- 14. CONSTRUCCIONES: separa terreno de lo edificado
-- ============================================================
create table construcciones (
  id                     uuid primary key default gen_random_uuid(),
  inmueble_id            uuid not null references inmuebles(id) on delete cascade,
  tipo_construccion      text not null default 'vivienda'
                         check (tipo_construccion in ('vivienda','comercio','galpon','oficina','otro')),
  area_construida_m2     numeric(10,2) not null check (area_construida_m2 > 0),
  niveles                integer not null default 1 check (niveles > 0),
  anio_construccion      integer,
  material_predominante  text check (material_predominante in ('concreto','bloque','madera','mixto','otro')),
  estado_construccion    text not null default 'bueno'
                         check (estado_construccion in ('bueno','regular','malo','en_construccion')),
  created_at             timestamptz default now()
);

create index idx_construcciones_inmueble on construcciones(inmueble_id);
alter table construcciones enable row level security;
create policy "crud construcciones" on construcciones for all using (auth.role() = 'authenticated');
