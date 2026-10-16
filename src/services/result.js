// Результат операції сервісу. Сервіси не знають про інтерфейс: вони повертають, що показати і що зробити.
//   message   — текст сповіщення (необов'язково)
//   isError   — чи це помилка
//   formPatch — які поля форми змінити після успіху
//   reload    — чи перезавантажити список
//   close     — чи закрити вікно редагування

export const failure = message => ({ message, isError: true })

export const success = (message, extra = {}) => ({ message, isError: false, ...extra })

// Нічого не сталося (напр. скасовано підтвердження)
export const nothing = () => ({})

// Повідомлення про помилку вставки (унікальний серійний номер / KIT або дублікат запису)
export const insertErrorText = error => {
  if (error.code === '23505') {
    return String(error.message).includes('serial')
      ? 'Такий серійний номер / KIT уже є'
      : 'Такий запис уже є, оновіть сторінку'
  }
  return 'Помилка бази: ' + error.message
}
