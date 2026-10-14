<script setup>
import { inventory } from '../store.js';
</script>

<template>
  <div>
      <h2 class="text-xl font-bold text-gray-800 mb-4">Поточні залишки</h2>
          <div v-if="inventory.length === 0" class="text-center text-gray-500 py-10 font-medium">Склад порожній.</div>
              <div v-for="item in inventory" :key="item.id" class="bg-white p-4 rounded-xl shadow-sm mb-3 flex justify-between items-center border-l-4" :class="item.quantity > 0 ? 'border-green-500' : 'border-red-500'">
                    <div>
                            <div class="text-xs text-gray-500 font-bold uppercase">{{ item.category }}</div>
                                    <div class="text-lg font-black text-gray-800">{{ item.name }}</div>
                                          </div>
                                                <div class="text-3xl font-black" :class="item.quantity > 0 ? 'text-green-600' : 'text-red-600'">
                                                        {{ item.quantity }}
                                                              </div>
                                                                  </div>
                                                                    </div>
                                                                    </template>
                                                                    