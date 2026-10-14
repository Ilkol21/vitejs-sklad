<script setup>
import { ref } from 'vue';
import { db } from '../db.js';
import { loadData, showMsg } from '../store.js';

const itemCategories = ['Дрони', 'Батареї', 'Спарки', 'Інше'];
const commonItems = ['Mavic 3', 'Mavic 3T', 'Mavic 4', 'Matrice 30T', 'Matrice 300', 'Autel Max', 'Батарея M3', 'Спарка'];

const formItem = ref(commonItems[0]);
const formCategory = ref(itemCategories[0]);
const formQty = ref(1);
const formType = ref('Втрата');

const processTransaction = async () => {
      try {
            let item = await db.inventory.where('name').equals(formItem.value).first();
                let newQty = formQty.value;
                    
                        if (item) {
                                  newQty = formType.value === 'Втрата' ? item.quantity - formQty.value : item.quantity + formQty.value;
                                        if (newQty < 0) newQty = 0;
                                              await db.inventory.update(item.id, { quantity: newQty });
                        } else {
                                  newQty = formType.value === 'Втрата' ? 0 : formQty.value;
                                        await db.inventory.add({ name: formItem.value, category: formCategory.value, quantity: newQty });
                        }

                            await db.transactions.add({
                                      date: new Date().toISOString(),
                                            name: formItem.value,
                                                  type: formType.value,
                                                        quantity: formQty.value
                            });

                                await loadData();
                                    showMsg('Запис додано успішно!');
                                        formQty.value = 1;
      } catch (error) {
            showMsg('Помилка бази даних!', true);
      }
};
</script>

<template>
  <div class="bg-white p-5 rounded-2xl shadow-sm">
      <h2 class="text-xl font-bold text-gray-800 mb-4">Запис руху майна</h2>
          
              <label class="block text-sm font-bold text-gray-600 mb-1">Що записуємо?</label>
                  <select v-model="formItem" class="w-full bg-gray-100 rounded-xl p-3 text-lg font-bold mb-4 outline-none">
                        <option v-for="item in commonItems" :key="item" :value="item">{{ item }}</option>
                            </select>

                                <label class="block text-sm font-bold text-gray-600 mb-1">Категорія (для нових)</label>
                                    <select v-model="formCategory" class="w-full bg-gray-100 rounded-xl p-3 text-lg font-bold mb-4 outline-none">
                                          <option v-for="cat in itemCategories" :key="cat" :value="cat">{{ cat }}</option>
                                              </select>

                                                  <label class="block text-sm font-bold text-gray-600 mb-1">Кількість</label>
                                                      <div class="flex items-center gap-4 mb-6">
                                                            <button @click="formQty > 1 && formQty--" class="flex-1 bg-gray-200 text-gray-700 rounded-xl text-3xl font-black py-2 active:bg-gray-300">-</button>
                                                                  <div class="text-4xl font-black text-gray-800 w-16 text-center">{{ formQty }}</div>
                                                                        <button @click="formQty++" class="flex-1 bg-gray-200 text-gray-700 rounded-xl text-3xl font-black py-2 active:bg-gray-300">+</button>
                                                                            </div>

                                                                                <div class="flex gap-2">
                                                                                      <button @click="formType = 'Втрата'; processTransaction()" class="flex-1 bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-black py-4 rounded-xl text-lg shadow-lg">ВТРАТА / СПИСАНО</button>
                                                                                            <button @click="formType = 'Прихід'; processTransaction()" class="flex-1 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-black py-4 rounded-xl text-lg shadow-lg">ПРИХІД / ДОДАНО</button>
                                                                                                </div>
                                                                                                  </div>
                                                                                                  </template>
      }
                            })
                        }
                        }
      }
}