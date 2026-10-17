import { round2 } from '../utils/number.js'
import { isPresenceRow } from './catalog.js'

// Зливання кількостей двох рядків одного майна: рядки «Є / Немає» зливаються максимумом,
// рядки з кількістю — сумою. Змішувати «Є» з кількістю не можна: тоді буде втрачено дані.
// Повертає { total, noCount } або { error }.
export const mergeRowQuantities = (target, source, name) => {
  const asRow = row => ({ ...row, item_name: name })
  const targetPresence = isPresenceRow(asRow(target))
  const sourcePresence = isPresenceRow(asRow(source))
  if (targetPresence !== sourcePresence) {
    return { error: "Не можна об'єднати: один рядок «Є / Немає», інший з кількістю. Спершу змініть облік у вікні редагування" }
  }
  const total = targetPresence
    ? Math.max(Number(target.quantity), Number(source.quantity))
    : round2(Number(target.quantity) + Number(source.quantity))
  return { total, noCount: targetPresence }
}
