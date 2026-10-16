import { createItemsRepository } from '../../src/api/itemsRepository.js'
import { createFakeClient } from './fakeDb.mjs'

export const POS = 'Позиція «Чіпс»'
export const OTHER = 'Позиція «Зебра»'

export const baseForm = (over = {}) => ({
  presetName: 'Генератор', status: 'На позиції', category: 'Живлення', quantity: 1, notes: '',
  brand: '', serial: '', variant: '', deviceModel: '', callsign: '', customName: '',
  kitNumbers: '', lengthM: '', extraQty: '', ...over
})

export const setup = (rows = [], opts) => {
  const client = createFakeClient(rows, opts)
  return { client, repo: createItemsRepository(client) }
}
