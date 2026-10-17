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

## Майно без кількості («просто є»)
Для «Лопастей» можна вказати або кількість, або просто «Є / Немає». Для цього в таблиці є колонка `no_count`.
Виконати в SQL Editor в такому порядку (спочатку колонка, потім тригер, бо тригер читає цю колонку):

1. [`no_count.sql`](./no_count.sql)
2. [`telegram_notifications.sql`](./telegram_notifications.sql) (повторно, щоб оновити тригер)

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

## Автопідписка за кодом доступу

Кожен, хто напише боту **код доступу**, отримує такі самі сповіщення (додавати chat_id вручну не потрібно).
Без коду бот мовчить: ім'я бота публічне, тому код захищає дані про склад від сторонніх.

Команди в боті: `/start` (вітання), `КОД` або `/start КОД` (підписка), `/stop` (відписка).
Після 5 невірних спроб чат блокується. Якщо людина заблокувала бота, сповіщення для неї вимикаються.

### Налаштування (один раз)
1. Виконати `telegram_notifications.sql` (створює таблицю `telegram_chats`), потім `telegram_subscribers.sql`.
2. Додати секрети у Vault (значення придумати свої, код доступу передавати людям лише в особистих повідомленнях):
```sql
select vault.create_secret('КОД_ДОСТУПУ', 'telegram_access_code');
select vault.create_secret('ДОВГИЙ_ВИПАДКОВИЙ_РЯДОК', 'telegram_webhook_secret');
```
   Секрет вебхука: лише латинські літери, цифри, `_` і `-`.
3. Вказати Telegram, куди надсилати повідомлення боту (підставити токен, секрет і ключ `anon` з `src/supabase.js`):
   Вкладений URL має бути закодований (`?` → `%3F`, `=` → `%3D`), інакше Telegram віддасть `&secret_token` зовнішньому запиту:
```
https://api.telegram.org/bot<ТОКЕН>/setWebhook?url=https%3A%2F%2F<ref>.supabase.co%2Frest%2Fv1%2Frpc%2Ftg_webhook%3Fapikey%3D<ANON_KEY>&secret_token=<СЕКРЕТ_ВЕБХУКА>&allowed_updates=%5B%22message%22%2C%22my_chat_member%22%5D
```
   Перевірка: `.../getWebhookInfo` (поле `last_error_message` має бути порожнім).
   Після `setWebhook` метод `getUpdates` перестає працювати: це нормально.

### Керування підписниками
```sql
select chat_id, name, username, active from public.telegram_chats order by created_at;  -- список
update public.telegram_chats set active = false where chat_id = 123456789;               -- відключити
update public.telegram_chats set fails = 0 where chat_id = 123456789;                    -- зняти блокування після невірних спроб
```
Змінити код доступу: `select vault.update_secret(id, 'НОВИЙ_КОД') from vault.secrets where name = 'telegram_access_code';`
(підписані раніше люди продовжують отримувати сповіщення).

## Обмеження
- Одна зміна = одне повідомлення. Масові зміни (наприклад, імпорт) дадуть багато повідомлень;
  Telegram обмежує ~20 повідомлень на хвилину в одну групу.
- Токен читається лише функцією-тригером (`security definer`); роль `anon` до Vault доступу не має.
