<script setup>
import { ref, computed } from 'vue';
import { transactions } from '../store.js';

const statStart = ref(new Date(new Date().setDate(1)).toISOString().split('T')[0]);
const statEnd = ref(new Date().toISOString().split('T')[0]);

const filteredTransactions = computed(() => {
      const start = new Date(statStart.value);
        start.setHours(0, 0, 0, 0);
          const end = new Date(statEnd.value);
            end.setHours(23, 59, 59, 999);
              return transactions.value.filter(t => {
                    const tDate = new Date(t.date);
                        return tDate >= start && tDate <= end;
              });
});

const statResults = computed(() => {
      const start = new Date(statStart.value);
        const end = new Date(statEnd.value);
          const days = Math.max(1, Math.ceil((end - start) / (1000 * 3600 * 24)));
            
              const losses = filteredTransactions.value.filter(t => t.type === 'Втрата');
                const grouped = {};
                  losses.forEach(t => {
                        if (!grouped[t.name]) grouped[t.name] = 0;
                            grouped[t.name] += t.quantity;
                  });

                    return Object.keys(grouped).map(name => ({
                            name, totalLost: grouped[name], avgPerDay: (grouped[name] / days).toFixed(2)
                    }));
});

const formatDate = (isoString) => {
      const d = new Date(isoString);
        return d.toLocaleDateString('uk-UA') + ' ' + d.toLocaleTimeString('uk-UA', {hour: '2-digit', minute:'2-digit'});
};
</script>

<template>
  <div>
      <h2 class="text-xl font-bold text-gray-800 mb-4">Аналітика та Журнал</h2>
          
              <div class="bg-white p-4 rounded-xl shadow-sm mb-4 border border-gray-200">
                    <label class="block text-sm font-bold text-gray-600 mb-2">Фільтр по датах</label>
                          <div class="flex gap-2">
                                  <input v-model="statStart" type="date" class="flex-1 bg-gray-100 p-2 rounded-lg font-bold outline-none text-sm" />
                                          <input v-model="statEnd" type="date" class="flex-1 bg-gray-100 p-2 rounded-lg font-bold outline-none text-sm" />
                                                </div>
                                                    </div>

                                                        <h3 class="text-sm font-bold text-gray-500 uppercase mb-2 mt-6">Зведення втрат за період</h3>
                                                            <div v-if="statResults.length === 0" class="text-center text-gray-500 bg-white p-4 rounded-xl">Втрат не зафіксовано.</div>
                                                                <div v-for="res in statResults" :key="res.name" class="bg-white p-4 rounded-xl shadow-sm mb-3 border-l-4 border-slate-700">
                                                                      <div class="text-lg font-black text-gray-800 mb-2">{{ res.name }}</div>
                                                                            <div class="flex justify-between">
                                                                                    <div class="text-center bg-red-100 text-red-700 px-3 py-2 rounded-lg flex-1 mr-2"><div class="text-xs font-bold">Всього втрат</div><div class="text-2xl font-black">{{ res.totalLost }}</div></div>
                                                                                            <div class="text-center bg-blue-100 text-blue-700 px-3 py-2 rounded-lg flex-1 ml-2"><div class="text-xs font-bold">Втрат на день</div><div class="text-2xl font-black">{{ res.avgPerDay }}</div></div>
                                                                                                  </div>
                                                                                                      </div>

                                                                                                          <h3 class="text-sm font-bold text-gray-500 uppercase mb-2 mt-6">Детальний журнал подій</h3>
                                                                                                              <div v-if="filteredTransactions.length === 0" class="text-center text-gray-500 bg-white p-4 rounded-xl">Немає записів за цей період.</div>
                                                                                                                  <div class="space-y-2">
                                                                                                                        <div v-for="t in filteredTransactions" :key="t.id" class="bg-white p-3 rounded-lg shadow-sm flex justify-between items-center text-sm border-l-4" :class="t.type === 'Втрата' ? 'border-red-500' : 'border-green-500'">
                                                                                                                                <div>
                                                                                                                                          <div class="font-bold text-gray-800">{{ t.name }}</div>
                                                                                                                                                    <div class="text-xs text-gray-500">{{ formatDate(t.date) }}</div>
                                                                                                                                                            </div>
                                                                                                                                                                    <div class="font-black text-lg" :class="t.type === 'Втрата' ? 'text-red-600' : 'text-green-600'">{{ t.type === 'Втрата' ? '-' : '+' }}{{ t.quantity }}</div>
                                                                                                                                                                          </div>
                                                                                                                                                                              </div>
                                                                                                                                                                                </div>
                                                                                                                                                                                </template>
}
                    }))
                  })
})
              })
})