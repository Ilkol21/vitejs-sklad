import { useToast } from './useToast.js'

// Застосовує результат сервісу до інтерфейсу: повідомлення, зміни форми, закриття вікна, перезавантаження списку.
// Порядок збігається з тим, що робив застосунок раніше: спершу форма й вікно, потім повідомлення, потім перезавантаження.
export const applyResult = (result, { loadItems, setFields, closeEdit } = {}) => {
  const { showMsg } = useToast()
  if (result.formPatch && setFields) setFields(result.formPatch)
  if (result.close && closeEdit) closeEdit()
  if (result.message) showMsg(result.message, result.isError)
  if (result.reload && loadItems) loadItems()
}
