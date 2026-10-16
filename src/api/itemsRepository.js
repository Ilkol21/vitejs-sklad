import { supabase } from '../supabase.js'
import { likePatternFor } from '../domain/itemName.js'

// Єдина точка доступу до таблиці items. Методи повертають { data, error } так само, як supabase-js,
// щоб сервіси самі вирішували, як показати помилку.

const TABLE = 'items'
const IDENTITY_COLUMNS = 'item_name, position_name, variant, brand, serial'

// Фабрика дозволяє підставити інший клієнт (у тестах — фейкову базу)
export const createItemsRepository = client => {
  const table = () => client.from(TABLE)

  return {
    fetchByPosition: positionName => table().select('*').eq('position_name', positionName),

    // Усі записи (або лише вказаної позиції, якщо передано)
    fetchAll: positionName => {
      const query = table().select('*')
      return positionName ? query.eq('position_name', positionName) : query
    },

    // Усі записи одного найменування (для перевірки унікальності серійних номерів, KIT, імен дронів)
    fetchSameBase: (baseName, { withId = false } = {}) =>
      table().select(withId ? `id, ${IDENTITY_COLUMNS}` : IDENTITY_COLUMNS).like('item_name', likePatternFor(baseName)),

    // Рядок на позиції з такою самою назвою й статусом (кандидат на зливання кількості)
    findSameRow: ({ positionName, itemName, status, columns, excludeId = null }) => {
      let query = table().select(columns)
        .eq('position_name', positionName).eq('item_name', itemName).eq('status', status)
      if (excludeId !== null) query = query.neq('id', excludeId)
      return query.limit(1)
    },

    insertItem: row => table().insert([row]),

    updateItem: (id, changes) => table().update(changes).eq('id', id),

    deleteItem: id => table().delete().eq('id', id),

    // Підписка на будь-які зміни в таблиці; повертає функцію відписки
    subscribeToChanges: onChange => {
      const channel = client
        .channel('public:items')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE }, onChange)
        .subscribe()
      return () => client.removeChannel(channel)
    }
  }
}

const repository = createItemsRepository(supabase)

export const {
  fetchByPosition, fetchAll, fetchSameBase, findSameRow, insertItem, updateItem, deleteItem, subscribeToChanges
} = repository
