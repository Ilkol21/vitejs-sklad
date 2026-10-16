// Безпечна робота з localStorage: у приватному режимі або при вимкненому сховищі застосунок працює без збереження.

export const readStorage = key => {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    return null
  }
}

export const writeStorage = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch (e) {
    /* сховище недоступне: працюємо без збереження */
  }
}
