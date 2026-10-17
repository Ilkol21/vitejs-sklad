-- Позначка «просто є / немає» без кількості для майна з комбінованим обліком (Лопасті).
-- true  = рядок без кількості: у звіті та Telegram він показується як «Є» / «НЕМАЄ» (кількість 1 або 0);
-- false = звичайний рядок з кількістю у штуках.
--
-- Виконати один раз у Supabase: SQL Editor -> New query -> Run. Скрипт безпечно запускати повторно.
-- Після нього варто ще раз виконати telegram_notifications.sql: він навчає тригер розпізнавати «просто є».

alter table public.items
  add column if not exists no_count boolean not null default false;

-- Старі записи «Лопасті» (без моделі) раніше велися як «Є / Немає»: позначаємо їх як «без кількості»,
-- щоб вони далі показувались так, як ви їх ввели («Є» без цифри).
update public.items
   set no_count = true
 where item_name = 'Лопасті'
   and no_count = false;

notify pgrst, 'reload schema';
