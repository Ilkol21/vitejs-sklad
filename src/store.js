import { ref } from 'vue';
import { db } from './db.js';

// Глобальні змінні стану
export const inventory = ref([]);
export const transactions = ref([]);
export const message = ref('');
export const unitName = ref(localStorage.getItem('drone_unit_name') || '');

// Глобальні функції
export const showMsg = (text, isError = false) => {
  message.value = (isError ? '❌ ' : '✅ ') + text;
    setTimeout(() => message.value = '', 3000);
    };

    export const loadData = async () => {
      inventory.value = await db.inventory.toArray();
        transactions.value = await db.transactions.orderBy('date').reverse().toArray();
        };

        export const saveUnitName = (name) => {
          unitName.value = name;
            localStorage.setItem('drone_unit_name', name);
              showMsg('Позивний збережено!');
              };