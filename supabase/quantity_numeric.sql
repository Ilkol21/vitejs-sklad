-- Дозволяє дробову кількість (наприклад, 2.5 л бензину).
-- Колонка items.quantity була bigint (лише цілі числа), тому запис 2.5 завершувався помилкою.
--
-- Виконати один раз у Supabase: SQL Editor -> New query -> Run.
-- Наявні значення (1, 2, 3...) лишаються без змін. Тригер Telegram цією зміною не спрацьовує.
-- Скрипт безпечно запускати повторно.

alter table public.items
  alter column quantity type numeric using quantity::numeric;

notify pgrst, 'reload schema';
