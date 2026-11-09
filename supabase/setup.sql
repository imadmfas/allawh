-- اللوح المحاور: نظام كلمات السر (كلمة لكل صف، مرتبطة بجهاز واحد)
-- يُلصق كاملًا في SQL Editor ثم Run. آمن لإعادة التشغيل.

create extension if not exists pgcrypto;
create schema if not exists allawh;
revoke all on schema allawh from public, anon, authenticated;

create table if not exists allawh.codes (
  code          text primary key,
  grade         text not null,                 -- p1 .. p6, m1 .. m3, s4-sci, s4-lit ... s6-lit
  note          text,                          -- اسم المشتري أو هاتفه
  created_at    timestamptz not null default now(),
  expires_at    timestamptz,                   -- فارغ = بلا انتهاء
  revoked       boolean not null default false,
  device_id     text,                          -- الجهاز المرتبط حاليًا
  device_label  text,
  activated_at  timestamptz,
  activations   int not null default 0
);
create index if not exists codes_grade on allawh.codes(grade);

create table if not exists allawh.admins (email text primary key);
insert into allawh.admins(email) values ('imad982@gmail.com') on conflict do nothing;

create table if not exists allawh.attempts (device_id text, at timestamptz default now());
create index if not exists attempts_dev on allawh.attempts(device_id, at);

-- ===== دوال الطالب (متاحة للجميع) =====
create or replace function public.allawh_activate(p_code text, p_device text, p_label text default null)
returns json language plpgsql security definer set search_path = allawh, public as $$
declare c allawh.codes; n int;
begin
  p_code := upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  if length(coalesce(p_device,'')) < 16 then return json_build_object('ok', false, 'error', 'device'); end if;
  select count(*) into n from allawh.attempts where device_id = p_device and at > now() - interval '15 minutes';
  if n >= 10 then return json_build_object('ok', false, 'error', 'too_many'); end if;
  select * into c from allawh.codes where code = p_code for update;
  if not found then
    insert into allawh.attempts(device_id) values (p_device);
    return json_build_object('ok', false, 'error', 'not_found');
  end if;
  if c.revoked then return json_build_object('ok', false, 'error', 'revoked'); end if;
  if c.expires_at is not null and c.expires_at < now() then return json_build_object('ok', false, 'error', 'expired'); end if;
  if c.device_id is not null and c.device_id <> p_device then return json_build_object('ok', false, 'error', 'other_device'); end if;
  update allawh.codes set device_id = p_device, device_label = left(p_label, 120),
    activated_at = coalesce(case when c.device_id = p_device then c.activated_at end, now()),
    activations = activations + case when c.device_id is null then 1 else 0 end
  where code = p_code;
  return json_build_object('ok', true, 'grade', c.grade, 'expires_at', c.expires_at);
end $$;

create or replace function public.allawh_check(p_code text, p_device text)
returns json language plpgsql security definer set search_path = allawh, public as $$
declare c allawh.codes;
begin
  select * into c from allawh.codes where code = upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g'));
  if not found or c.revoked or (c.expires_at is not null and c.expires_at < now()) or c.device_id is distinct from p_device
    then return json_build_object('ok', false); end if;
  return json_build_object('ok', true, 'grade', c.grade, 'expires_at', c.expires_at);
end $$;

create or replace function public.allawh_logout(p_code text, p_device text)
returns json language plpgsql security definer set search_path = allawh, public as $$
begin
  update allawh.codes set device_id = null, device_label = null
  where code = upper(regexp_replace(coalesce(p_code,''), '[^A-Za-z0-9]', '', 'g')) and device_id = p_device;
  return json_build_object('ok', found);
end $$;

-- ===== دوال المدير (تحتاج تسجيل دخول بالبريد المسجّل في admins) =====
create or replace function allawh.is_admin() returns boolean language sql stable security definer set search_path = allawh, public as $$
  select exists(select 1 from allawh.admins where email = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

create or replace function public.allawh_admin_create(p_grade text, p_count int, p_note text default null, p_days int default null)
returns setof text language plpgsql security definer set search_path = allawh, public as $$
declare i int; k text; alpha text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
begin
  if not allawh.is_admin() then raise exception 'not admin'; end if;
  if p_count < 1 or p_count > 200 then raise exception 'count 1..200'; end if;
  for i in 1..p_count loop
    loop
      select string_agg(substr(alpha, 1 + (get_byte(gen_random_bytes(1),0) % 32), 1), '') into k from generate_series(1,12);
      exit when not exists(select 1 from allawh.codes where code = k);
    end loop;
    insert into allawh.codes(code, grade, note, expires_at)
      values (k, p_grade, p_note, case when p_days is null then null else now() + make_interval(days => p_days) end);
    return next k;
  end loop;
end $$;

create or replace function public.allawh_admin_list(p_grade text default null)
returns json language plpgsql security definer set search_path = allawh, public as $$
declare r json;
begin
  if not allawh.is_admin() then raise exception 'not admin'; end if;
  select coalesce(json_agg(c order by c.created_at desc), '[]'::json) into r
    from (select * from allawh.codes where p_grade is null or grade = p_grade order by created_at desc limit 3000) c;
  return r;
end $$;

create or replace function public.allawh_admin_release(p_code text)
returns void language plpgsql security definer set search_path = allawh, public as $$
begin
  if not allawh.is_admin() then raise exception 'not admin'; end if;
  update allawh.codes set device_id = null, device_label = null where code = p_code;
end $$;

create or replace function public.allawh_admin_set(p_code text, p_revoked boolean, p_note text)
returns void language plpgsql security definer set search_path = allawh, public as $$
begin
  if not allawh.is_admin() then raise exception 'not admin'; end if;
  update allawh.codes set revoked = p_revoked, note = p_note where code = p_code;
end $$;

-- الصلاحيات
revoke execute on function public.allawh_admin_create(text,int,text,int), public.allawh_admin_list(text),
  public.allawh_admin_release(text), public.allawh_admin_set(text,boolean,text), allawh.is_admin() from public, anon;
grant execute on function public.allawh_activate(text,text,text), public.allawh_check(text,text), public.allawh_logout(text,text) to anon, authenticated;
grant execute on function public.allawh_admin_create(text,int,text,int), public.allawh_admin_list(text),
  public.allawh_admin_release(text), public.allawh_admin_set(text,boolean,text) to authenticated;
grant usage on schema allawh to authenticated;
grant execute on function allawh.is_admin() to authenticated;
