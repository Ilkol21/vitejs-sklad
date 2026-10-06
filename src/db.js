import Dexie from 'dexie';

export const db = new Dexie('WarehouseDB');

db.version(1).stores({
  // Залишки: id, категорія (дрон/батарея), назва (Мавік 3), кількість
    inventory: '++id, category, name, quantity',
      
        // Рух майна: id, дата, id товару, тип (прихід/втрата), кількість
          transactions: '++id, date, itemId, type, quantity'
          });