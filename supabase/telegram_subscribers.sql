-- Автопідписка на сповіщення за кодом доступу.
-- Виконати ПІСЛЯ telegram_notifications.sql (потрібна таблиця telegram_chats).
--
-- Telegram надсилає повідомлення боту на /rest/v1/rpc/tg_webhook.
-- Функція перевіряє секретний заголовок, а потім:
--   /start             -> вітання
--   КОД або /start КОД -> підписка (після 5 невірних спроб чат блокується)
--   /stop              -> відписка
-- Секрети (в цей файл НЕ записувати) лежать у Vault:
--   telegram_bot_token, telegram_webhook_secret, telegram_access_code

create or replace function public.tg_webhook(jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions, vault
as $$
declare
  u        jsonb := $1;
  v_token  text;
  v_secret text;
  v_code   text;
  v_msg    jsonb;
  v_chat   bigint;
  v_text   text;
  v_row    public.telegram_chats;
  v_reply  text;
  c_max    constant int := 5;
begin
  select decrypted_secret into v_token  from vault.decrypted_secrets where name = 'telegram_bot_token' limit 1;
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'telegram_webhook_secret' limit 1;
  select decrypted_secret into v_code   from vault.decrypted_secrets where name = 'telegram_access_code' limit 1;
  if v_token is null or v_secret is null or v_code is null then return '{}'::jsonb; end if;

  -- Приймаємо лише запити від Telegram (секретний заголовок з setWebhook)
  if coalesce(current_setting('request.headers', true), '{}')::jsonb ->> 'x-telegram-bot-api-secret-token'
       is distinct from v_secret then
    return '{}'::jsonb;
  end if;

  -- Людина заблокувала бота / вийшла -> вимикаємо сповіщення
  if u ? 'my_chat_member' then
    if u #>> '{my_chat_member,chat,type}' = 'private'
       and u #>> '{my_chat_member,new_chat_member,status}' in ('kicked', 'left') then
      update public.telegram_chats set active = false
       where chat_id = (u #>> '{my_chat_member,chat,id}')::bigint;
    end if;
    return '{}'::jsonb;
  end if;

  v_msg := u -> 'message';
  if v_msg is null or v_msg #>> '{chat,type}' is distinct from 'private' then
    return '{}'::jsonb;
  end if;

  v_chat := (v_msg #>> '{chat,id}')::bigint;
  v_text := trim(coalesce(v_msg ->> 'text', ''));

  insert into public.telegram_chats (chat_id, name, username)
  values (v_chat,
          trim(coalesce(v_msg #>> '{from,first_name}', '') || ' ' || coalesce(v_msg #>> '{from,last_name}', '')),
          v_msg #>> '{from,username}')
  on conflict (chat_id) do update set name = excluded.name, username = excluded.username;
  select * into v_row from public.telegram_chats where chat_id = v_chat;

  if v_text ~* '^/stop(@\w+)?$' then
    update public.telegram_chats set active = false where chat_id = v_chat;
    v_reply := 'Сповіщення вимкнено. Щоб увімкнути знову, надішліть код доступу.';
  elsif v_row.fails >= c_max then
    v_reply := 'Забагато невірних спроб. Зверніться до адміністратора.';
  else
    v_text := trim(regexp_replace(v_text, '^/start(@\w+)?\s*', '', 'i'));
    if v_text <> '' and upper(replace(v_text, ' ', '')) = upper(replace(v_code, ' ', '')) then
      update public.telegram_chats set active = true, fails = 0 where chat_id = v_chat;
      v_reply := '✅ Підписку увімкнено. Ви отримуватимете сповіщення про зміни майна на позиціях. Вимкнути: /stop';
    elsif v_text = '' then
      v_reply := case when v_row.active
        then 'Ви підписані на сповіщення. Вимкнути: /stop'
        else 'Привіт! Це бот сповіщень про майно на позиціях. Щоб отримувати сповіщення, надішліть код доступу.' end;
    elsif v_row.active then
      v_reply := 'Ви вже підписані на сповіщення. Вимкнути: /stop';
    else
      update public.telegram_chats set fails = fails + 1 where chat_id = v_chat;
      v_reply := 'Невірний код доступу. Залишилось спроб: ' || greatest(c_max - v_row.fails - 1, 0);
    end if;
  end if;

  perform net.http_post(
    url     := 'https://api.telegram.org/bot' || v_token || '/sendMessage',
    body    := jsonb_build_object('chat_id', v_chat, 'text', v_reply),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  return '{}'::jsonb;
exception when others then
  -- Telegram має отримати 200, інакше буде повторювати запит
  raise warning 'tg_webhook failed: %', sqlerrm;
  return '{}'::jsonb;
end;
$$;

revoke all on function public.tg_webhook(jsonb) from public;
grant execute on function public.tg_webhook(jsonb) to anon, authenticated;

notify pgrst, 'reload schema';
