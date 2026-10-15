-- Забороняє дублікати в таблиці items: один рядок = позиція + назва + статус.
-- Кількість однакового майна з тим самим статусом зберігається в одному рядку.
--
-- Виконати один раз у Supabase: SQL Editor -> New query -> Run.
-- Скрипт сам об'єднує наявні дублікати (кількість підсумовується), а потім створює індекс.
-- Увага: кожне оновлення/видалення під час об'єднання надішле повідомлення в Telegram,
-- тому якщо дублікатів багато, спершу можна вимкнути тригер:
--   alter table public.items disable trigger items_telegram_notify;
-- а після скрипта увімкнути:
--   alter table public.items enable trigger items_telegram_notify;

with grp as (
  select position_name, item_name, status,
         min(id) as keep_id, sum(quantity) as total,
         nullif(string_agg(distinct nullif(trim(notes), ''), '; '), '') as all_notes
    from public.items
   group by position_name, item_name, status
  having count(*) > 1
), upd as (
  update public.items i
     set quantity = g.total,
         notes = coalesce(g.all_notes, i.notes)
    from grp g
   where i.id = g.keep_id
  returning i.id
)
delete from public.items i
 using grp g
 where i.position_name = g.position_name
   and i.item_name = g.item_name
   and i.status = g.status
   and i.id <> g.keep_id;

create unique index if not exists items_unique_pos_name_status
  on public.items (position_name, item_name, status);
