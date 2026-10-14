import Dexie from 'dexie';

export const db = new Dexie('ViteJsSkladDB');
db.version(1).stores({
  positions: '++id, name',
    items: '++id, positionId, category, itemName, status, quantity, notes',
      logs: '++id, timestamp, action, details'
      });

      // Базовий перелік майна (кількість за замовчуванням 0 за вимогою командира)
      export const DEFAULT_TEMPLATE_ITEMS = [
        // Зарядні станції та живлення
          { category: 'Живлення', itemName: 'Зарядна станція: Initial Entropy Energy', status: 'На позиції', quantity: 0, notes: '' },
            { category: 'Живлення', itemName: 'Зарядна станція: EcoFlow Rto', status: 'На позиції', quantity: 0, notes: '' },
              { category: 'Живлення', itemName: 'Зарядна станція: EcoFlow', status: 'На позиції', quantity: 0, notes: '' },
                { category: 'Живлення', itemName: 'Зарядна станція: Dabbsson', status: 'На позиції', quantity: 0, notes: '' },
                  { category: 'Живлення', itemName: 'Генератор: KS 3301i', status: 'На позиції', quantity: 0, notes: '' },
                    { category: 'Живлення', itemName: 'Зарядки до спарок (Toolkit)', status: 'На позиції', quantity: 0, notes: '' },
                      { category: 'Живлення', itemName: 'Бур', status: 'Неробочий стан', quantity: 0, notes: '' },

                        // Зв'язок та Оптика
                          { category: 'Зв\'язок', itemName: 'Старлінк: Mini', status: 'На позиції', quantity: 0, notes: '' },
                            { category: 'Зв\'язок', itemName: 'Камера відеоспостереження', status: 'На позиції', quantity: 0, notes: '' },
                              { category: 'Зв\'язок', itemName: 'Антена: Евенджер', status: 'На позиції', quantity: 0, notes: '' },
                                { category: 'Зв\'язок', itemName: 'Антена: AcaSom', status: 'На позиції', quantity: 0, notes: '' },
                                  { category: 'Зв\'язок', itemName: 'Репітор', status: 'На позиції', quantity: 0, notes: '' },
                                    { category: 'Зв\'язок', itemName: 'Кабелі', status: 'На позиції', quantity: 0, notes: '' },
                                      { category: 'Зв\'язок', itemName: 'Бахмут телеком (обладнання)', status: 'Неробочий стан', quantity: 0, notes: '' },

                                        // БПЛА та Пульти
                                          { category: 'БПЛА', itemName: 'Пульт: Мавік 3', status: 'На позиції', quantity: 0, notes: '' },
                                            { category: 'БПЛА', itemName: 'Пульт: Матріс 4', status: 'На позиції', quantity: 0, notes: '' },
                                              { category: 'БПЛА', itemName: 'Дрон: День', status: 'На позиції', quantity: 0, notes: '' },
                                                { category: 'БПЛА', itemName: 'Дрон: Ніч', status: 'На позиції', quantity: 0, notes: '' },
                                                  { category: 'БПЛА', itemName: 'Батареї (Батки)', status: 'На позиції', quantity: 0, notes: '' },
                                                    { category: 'БПЛА', itemName: 'Хаби для баток: Мавік', status: 'На позиції', quantity: 0, notes: '' },
                                                      { category: 'БПЛА', itemName: 'Хаби для баток: Матріс', status: 'На позиції', quantity: 0, notes: '' },

                                                        // Інше / Спорядження
                                                          { category: 'Інше', itemName: 'Планшет: Samsung SM-T220', status: 'На позиції', quantity: 0, notes: '' },
                                                            { category: 'Інше', itemName: 'Вогнегасники', status: 'На позиції', quantity: 0, notes: '' },
                                                              { category: 'Інше', itemName: 'Протигази', status: 'На позиції', quantity: 0, notes: '' },
                                                                { category: 'Інше', itemName: 'Лопати', status: 'На позиції', quantity: 0, notes: '' }
                                                                ];