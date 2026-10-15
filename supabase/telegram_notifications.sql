-- Сповіщення в Telegram про кожну зміну в таблиці public.items
-- (додавання, зміна кількості/статусу/приміток/категорії/позиції, видалення).
--
-- Виконати у Supabase: SQL Editor -> New query -> Run.
-- Скрипт можна запускати повторно: він оновлює функцію й тригер.
-- Токен бота і chat_id в цей файл НЕ записувати: вони лежать у Vault
-- (див. supabase/README.md).
--
-- Формат: перший рядок відповідає на питання «що сталося і де»:
--   🟡 ПОТРЕБА · Позиція «Чіпс»
--   📦 Дрони — Mavic 3T
--   Статус: 🟢 На позиції → 🟡 Потреба
--   Зараз: 2 шт. · 🟡 Потреба

-- 1. Розширення
create extension if not exists pg_net with schema extensions;
create extension if not exists supabase_vault;

-- 2. Екранування для Telegram parse_mode=HTML
create or replace function public.tg_escape(t text)
returns text
language sql
immutable
as $$
  select replace(replace(replace(coalesce(t, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;');
$$;

-- 3. Іконка статусу
create or replace function public.tg_status_icon(s text)
returns text
language sql
immutable
as $$
  select case s
    when 'На позиції' then '🟢'
    when 'Потреба'    then '🟡'
    when 'На ремонт'  then '🔴'
    else '⚪️'
  end;
$$;

-- 4. Функція-тригер
create or replace function public.notify_telegram_items_change()
returns trigger
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  v_token   text;
  v_chats   text;
  v_chat    text;
  v_text    text;
  v_head    text;
  v_changes text := '';
  v_now     text;
  v_time    text := to_char(now() at time zone 'Europe/Kiev', 'DD.MM.YYYY HH24:MI');
begin
  select decrypted_secret into v_token
    from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_chats
    from vault.decrypted_secrets where name = 'telegram_chat_id' limit 1;

  -- Якщо бот ще не налаштований, нічого не робимо (запис у базу не ламається)
  if v_token is null or v_chats is null then
    return null;
  end if;

  if tg_op = 'INSERT' then
    v_text :=
         '➕ <b>ДОДАНО</b> · ' || public.tg_escape(new.position_name) || E'\n'
      || '📦 <b>' || public.tg_escape(new.item_name) || '</b>' || E'\n'
      || 'Категорія: ' || public.tg_escape(new.category) || E'\n'
      || 'Зараз: <b>' || coalesce(new.quantity::text, '—') || ' шт.</b> · '
      || public.tg_status_icon(new.status) || ' ' || public.tg_escape(new.status)
      || case when coalesce(new.notes, '') <> ''
              then E'\n' || '📝 ' || public.tg_escape(new.notes) else '' end
      || E'\n';

  elsif tg_op = 'UPDATE' then
    -- Заголовок залежить від головної зміни: статус > кількість > інше
    if new.status is distinct from old.status then
      v_head := public.tg_status_icon(new.status) || ' <b>' || upper(public.tg_escape(new.status)) || '</b>';
    elsif new.quantity is distinct from old.quantity then
      v_head := '🔢 <b>КІЛЬКІСТЬ</b>';
    else
      v_head := '✏️ <b>ЗМІНЕНО</b>';
    end if;

    if new.status is distinct from old.status then
      v_changes := v_changes || 'Статус: ' || public.tg_status_icon(old.status) || ' ' || public.tg_escape(old.status)
        || ' → ' || public.tg_status_icon(new.status) || ' <b>' || public.tg_escape(new.status) || '</b>' || E'\n';
    end if;
    if new.quantity is distinct from old.quantity then
      v_changes := v_changes || 'Кількість: ' || coalesce(old.quantity::text, '—')
        || ' → <b>' || coalesce(new.quantity::text, '—') || '</b>' || E'\n';
    end if;
    if new.notes is distinct from old.notes then
      v_changes := v_changes || 'Примітка: ' || public.tg_escape(old.notes)
        || ' → <b>' || public.tg_escape(new.notes) || '</b>' || E'\n';
    end if;
    if new.category is distinct from old.category then
      v_changes := v_changes || 'Категорія: ' || public.tg_escape(old.category)
        || ' → <b>' || public.tg_escape(new.category) || '</b>' || E'\n';
    end if;
    if new.item_name is distinct from old.item_name then
      v_changes := v_changes || 'Назва: ' || public.tg_escape(old.item_name)
        || ' → <b>' || public.tg_escape(new.item_name) || '</b>' || E'\n';
    end if;
    if new.position_name is distinct from old.position_name then
      v_changes := v_changes || 'Позиція: ' || public.tg_escape(old.position_name)
        || ' → <b>' || public.tg_escape(new.position_name) || '</b>' || E'\n';
    end if;

    -- Нічого суттєвого не змінилось: не спамимо
    if v_changes = '' then
      return null;
    end if;

    v_now := 'Зараз: <b>' || coalesce(new.quantity::text, '—') || ' шт.</b> · '
      || public.tg_status_icon(new.status) || ' ' || public.tg_escape(new.status);

    v_text :=
         v_head || ' · ' || public.tg_escape(new.position_name) || E'\n'
      || '📦 <b>' || public.tg_escape(new.item_name) || '</b>' || E'\n'
      || v_changes
      || v_now || E'\n'
      || case when coalesce(new.quantity, 0) = 0
              then '⚠️ <b>Немає в наявності</b>' || E'\n' else '' end;

  else -- DELETE
    v_text :=
         '🗑 <b>ВИДАЛЕНО</b> · ' || public.tg_escape(old.position_name) || E'\n'
      || '📦 <b>' || public.tg_escape(old.item_name) || '</b>' || E'\n'
      || 'Категорія: ' || public.tg_escape(old.category) || E'\n'
      || 'Було: ' || coalesce(old.quantity::text, '—') || ' шт. · '
      || public.tg_status_icon(old.status) || ' ' || public.tg_escape(old.status) || E'\n';
  end if;

  v_text := v_text || '🕒 ' || v_time;

  -- chat_id може бути списком через кому (кілька командирів / група)
  foreach v_chat in array string_to_array(replace(v_chats, ' ', ''), ',') loop
    perform net.http_post(
      url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
      body    := jsonb_build_object(
                   'chat_id', v_chat,
                   'text', v_text,
                   'parse_mode', 'HTML',
                   'disable_web_page_preview', true
                 ),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end loop;

  return null;
exception when others then
  -- Помилка сповіщення ніколи не повинна блокувати зміну даних на складі
  raise warning 'notify_telegram_items_change failed: %', sqlerrm;
  return null;
end;
$$;

revoke all on function public.notify_telegram_items_change() from public, anon, authenticated;

-- 5. Тригер
drop trigger if exists items_telegram_notify on public.items;
create trigger items_telegram_notify
  after insert or update or delete on public.items
  for each row execute function public.notify_telegram_items_change();
