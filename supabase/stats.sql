-- اللوح المحاور: عدّاد الزيارات الكلي (يُشغَّل مرة واحدة في SQL Editor)
create table if not exists allawh.stats (key text primary key, n bigint not null default 0);
insert into allawh.stats(key, n) values ('total', 0) on conflict do nothing;

-- يزيد عدّاد الزيارات الكلي وعدّاد الصفحة، ويعيد المجموع الكلي
create or replace function public.allawh_hit(p_page text default 'hub')
returns bigint language plpgsql security definer set search_path = allawh, public as $$
declare t bigint;
begin
  insert into allawh.stats(key, n) values ('page:' || left(coalesce(p_page, 'hub'), 40), 1)
    on conflict (key) do update set n = allawh.stats.n + 1;
  update allawh.stats set n = n + 1 where key = 'total' returning n into t;
  return t;
end $$;

-- يقرأ العدّاد دون زيادة
create or replace function public.allawh_total()
returns bigint language sql stable security definer set search_path = allawh, public as $$
  select n from allawh.stats where key = 'total';
$$;

grant execute on function public.allawh_hit(text), public.allawh_total() to anon, authenticated;
