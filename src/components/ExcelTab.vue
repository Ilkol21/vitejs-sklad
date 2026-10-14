<script setup>
import { ref } from 'vue';
import * as XLSX from 'xlsx';
import { db } from '../db.js';
import { inventory, transactions, unitName, loadData, showMsg, saveUnitName } from '../store.js';

const localUnitName = ref(unitName.value);

const handleSaveUnit = () => {
      saveUnitName(localUnitName.value);
};

const exportExcel = () => {
      try {
            const wb = XLSX.utils.book_new();
                const wsInventory = XLSX.utils.json_to_sheet(inventory.value.map(i => ({ 'Категорія': i.category, 'Назва': i.name, 'Кількість на складі': i.quantity })));
                    XLSX.utils.book_append_sheet(wb, wsInventory, 'Залишки');

                        const wsLogs = XLSX.utils.json_to_sheet(transactions.value.map(t => ({ 'Дата': new Date(t.date).toLocaleString('uk-UA'), 'Майно': t.name, 'Операція': t.type, 'Кількість': t.quantity })));
                            XLSX.utils.book_append_sheet(wb, wsLogs, 'Журнал рухів');

                                const prefix = unitName.value ? `_${unitName.value.replace(/\s+/g, '')}` : '';
                                    const dateStr = new Date().toLocaleDateString('uk-UA').replace(/\./g, '-');
                                        XLSX.writeFile(wb, `Звіт_Склад${prefix}_${dateStr}.xlsx`);
                                            showMsg('Файл Excel завантажено!');
      } catch (error) {
            showMsg('Помилка генерації Excel!', true);
      }
};

const importExcel = (event) => {
      const file = event.target.files[0];
        if (!file) return;
          const reader = new FileReader();
            reader.onload = async (e) => {
                    try {
                              const data = new Uint8Array(e.target.result);
                                    const wb = XLSX.read(data, { type: 'array' });
                                          const invSheet = wb.Sheets['Залишки'];
                                                if (invSheet) {
                                                            const invData = XLSX.utils.sheet_to_json(invSheet);
                                                                    await db.inventory.clear();
                                                                            for (const row of invData) {
                                                                                          await db.inventory.add({ category: row['Категорія'] || 'Інше', name: row['Назва'], quantity: Number(row['Кількість на складі']) || 0 });
                                                                            }
                                                }
                                                      await loadData();
                                                            showMsg('Дані з Excel завантажено!');
                                                                  event.target.value = '';
                    } catch (error) {
                              showMsg('Помилка читання файлу!', true);
                    }
            };
              reader.readAsArrayBuffer(file);
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm space-y-6">
      <div class="bg-gray-50 p-4 rounded-xl border border-gray-200">
            <label class="block text-sm font-bold text-gray-600 mb-2">Ваш підрозділ / Позивний</label>
                  <div class="flex gap-2">
                          <input v-model="localUnitName" type="text" placeholder="Напр. 3 Рота" class="flex-1 bg-white border border-gray-300 rounded-lg p-2 font-bold outline-none" />
                                  <button @click="handleSaveUnit" class="bg-slate-700 text-white px-4 rounded-lg font-bold text-sm">Зберегти</button>
                                        </div>
                                              <p class="text-xs text-gray-500 mt-2">Буде додано до назви Excel файлу.</p>
                                                  </div>
                                                      <hr class="border-gray-200" />
                                                          <div>
                                                                <button @click="exportExcel" class="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-black py-4 rounded-xl text-lg shadow-lg flex items-center justify-center gap-2">📊 ЗБЕРЕГТИ В EXCEL</button>
                                                                    </div>
                                                                        <div>
                                                                              <label class="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-black py-4 rounded-xl text-lg shadow-sm flex items-center justify-center cursor-pointer transition-colors">📂 ВІДКРИТИ EXCEL<input type="file" accept=".xlsx, .xls" class="hidden" @change="importExcel" /></label>
                                                                                    <p class="text-xs text-center text-red-500 mt-2 font-bold">Увага! Оновить поточні залишки.</p>
                                                                                        </div>
                                                                                          </div>
                                                                                          </template>
                    }
                                                                            }
                                                }
                    }
            }
}
      }
      }
}
}