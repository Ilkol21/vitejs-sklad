-- Окремі колонки для виду / моделі / назви, марки та серійного номера (KIT).
-- Раніше все це зберігалось лише всередині item_name («Рація + павук — Motorola, S/N 123»).
--
-- Виконати один раз у Supabase: SQL Editor -> New query -> Run.
-- Скрипт безпечно запускати повторно. Наявні записи переносяться в колонки автоматично.
-- item_name лишається як є (його показують таблиця і Telegram).
--
-- Якщо індекс не створюється з помилкою про дублікат, у базі вже є два однакових
-- серійних номери. Знайти їх:
--   select lower(split_part(item_name, ' — ', 1)) as base, lower(coalesce(brand, '')) as brand,
--          lower(serial) as serial, count(*) from public.items
--    where serial is not null group by 1, 2, 3 having count(*) > 1;

alter table public.items
  add column if not exists variant text,
  add column if not exists brand   text,
  add column if not exists serial  text;

-- Перенос із назви у колонки (лише для записів, у яких колонки ще порожні)
with parsed as (
  select id, substring(item_name from ' — (.*)$') as rest
    from public.items
   where item_name like '% — %'
     and variant is null and brand is null and serial is null
), p as (
  select id, rest, regexp_match(rest, '^(?:(.*?),\s*)?(S/N|KIT)\s+(.+)$') as m
    from parsed
)
update public.items i
   set variant = case when p.m is null then p.rest
                      when p.m[2] = 'KIT' then nullif(p.m[1], '')
                      else null end,
       brand   = case when p.m is not null and p.m[2] = 'S/N' then nullif(p.m[1], '')
                      else null end,
       serial  = case when p.m is not null then p.m[3] else null end
  from p
 where i.id = p.id;

-- Серійний номер / KIT унікальний в межах «найменування + марка» на всіх позиціях.
-- (Motorola S/N 1 і Hytera S/N 1 дозволені; регістр не враховується.)
create unique index if not exists items_unique_serial
  on public.items (lower(split_part(item_name, ' — ', 1)), lower(coalesce(brand, '')), lower(serial))
  where serial is not null;

notify pgrst, 'reload schema';
