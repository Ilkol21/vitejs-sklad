<script setup>
import { ref, onMounted } from 'vue';
import { message, unitName, loadData } from './store.js';

import SkladTab from './components/SkladTab.vue';
import LogTab from './components/LogTab.vue';
import StatTab from './components/StatTab.vue';
import ExcelTab from './components/ExcelTab.vue';

const activeTab = ref('sklad');

onMounted(loadData);
</script>

<template>
  <div class="max-w-md mx-auto bg-gray-50 min-h-screen shadow-lg pb-20 relative">
      
          <header class="bg-slate-800 text-white p-4 font-bold text-center text-xl shadow-md">
                📦 Склад БПЛА <span v-if="unitName" class="text-sm font-normal opacity-70">({{ unitName }})</span>
                    </header>

                        <div v-if="message" class="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full font-bold shadow-2xl z-50 transition-all text-sm whitespace-nowrap">
                              {{ message }}
                                  </div>

                                      <!-- Область, де перемикаються вкладки -->
                                          <div class="p-4 space-y-4">
                                                <SkladTab v-if="activeTab === 'sklad'" />
                                                      <LogTab v-if="activeTab === 'log'" />
                                                            <StatTab v-if="activeTab === 'stat'" />
                                                                  <ExcelTab v-if="activeTab === 'excel'" />
                                                                      </div>

                                                                          <!-- Нижня навігація -->
                                                                              <nav class="fixed bottom-0 left-0 w-full bg-white border-t-2 border-gray-100 flex justify-around p-2 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-40 max-w-md left-1/2 -translate-x-1/2">
                                                                                    <button @click="activeTab = 'sklad'" class="p-2 flex flex-col items-center flex-1 transition-colors" :class="activeTab === 'sklad' ? 'text-blue-600' : 'text-gray-400'">
                                                                                            <span class="text-2xl">📦</span><span class="text-[10px] font-bold mt-1">Склад</span>
                                                                                                  </button>
                                                                                                        <button @click="activeTab = 'log'" class="p-2 flex flex-col items-center flex-1 transition-colors" :class="activeTab === 'log' ? 'text-blue-600' : 'text-gray-400'">
                                                                                                                <span class="text-2xl">🔄</span><span class="text-[10px] font-bold mt-1">Рух</span>
                                                                                                                      </button>
                                                                                                                            <button @click="activeTab = 'stat'" class="p-2 flex flex-col items-center flex-1 transition-colors" :class="activeTab === 'stat' ? 'text-blue-600' : 'text-gray-400'">
                                                                                                                                    <span class="text-2xl">📈</span><span class="text-[10px] font-bold mt-1">Аналіз</span>
                                                                                                                                          </button>
                                                                                                                                                <button @click="activeTab = 'excel'" class="p-2 flex flex-col items-center flex-1 transition-colors" :class="activeTab === 'excel' ? 'text-blue-600' : 'text-gray-400'">
                                                                                                                                                        <span class="text-2xl">📊</span><span class="text-[10px] font-bold mt-1">Excel</span>
                                                                                                                                                              </button>
                                                                                                                                                                  </nav>

                                                                                                                                                                    </div>
                                                                                                                                                                    </template>