# Сповіщення в Telegram

Бот надсилає командиру повідомлення про кожну зміну в таблиці `items`:
додавання, зміна кількості / статусу / приміток / категорії / позиції, видалення.
Працює на стороні Supabase (тригер у базі + `pg_net`), тому веб-застосунок відкривати не потрібно.

## Налаштування

### 1. Створити бота
1. У Telegram відкрити [@BotFather](https://t.me/BotFather) → `/newbot` → отримати **токен** (`123456:ABC...`).
2. Командир (або група, куди додано бота) має написати боту будь-яке повідомлення (`/start`).
   Без цього бот не зможе писати першим.

### 2. Дізнатися chat_id
Відкрити в браузері (підставивши токен):

```
https://api.telegram.org/bot<ТОКЕН>/getUpdates
```

У відповіді знайти `"chat":{"id": ...}`. Для групи id від'ємний (`-100...`).

### 3. Виконати SQL
Supabase → **SQL Editor**:

1. Вставити й виконати весь файл [`telegram_notifications.sql`](./telegram_notifications.sql).
2. Окремим запитом додати секрети (підставити свої значення; у git їх не зберігати):

```sql
select vault.create_secret('ТОКЕН_БОТА', 'telegram_bot_token');
select vault.create_secret('CHAT_ID', 'telegram_chat_id');
```

Кілька отримувачів: `'111111111,222222222,-1001234567890'`.

### 4. Перевірка
Змінити кількість будь-якого майна в застосунку. У Telegram має прийти повідомлення на кшталт:

```
✏️ Змінено
📍 Позиція «Чіпс»
📦 Дрон: День
Кількість: 2 → 3
🕒 15.10.2026 12:30
```

## Діагностика
- Нічого не приходить: перевірити, що секрети створені
  `select name from vault.decrypted_secrets;` і що боту писали `/start`.
- Відповіді Telegram (помилки токена / chat_id):
  `select status_code, content from net._http_response order by created desc limit 5;`
- Попередження тригера дивитись у Logs → Postgres.

## Зміна токена / chat_id
```sql
select vault.update_secret(id, 'НОВЕ_ЗНАЧЕННЯ') from vault.secrets where name = 'telegram_bot_token';
select vault.update_secret(id, 'НОВЕ_ЗНАЧЕННЯ') from vault.secrets where name = 'telegram_chat_id';
```

## Вимкнення
```sql
drop trigger if exists items_telegram_notify on public.items;
```

## Обмеження
- Одна зміна = одне повідомлення. Масові зміни (наприклад, імпорт) дадуть багато повідомлень;
  Telegram обмежує ~20 повідомлень на хвилину в одну групу.
- Токен читається лише функцією-тригером (`security definer`); роль `anon` до Vault доступу не має.
