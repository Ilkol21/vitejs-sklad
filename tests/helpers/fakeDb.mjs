// Підмінена база в пам'яті з тим самим API запитів, що й supabase-js (робить тільки те, що використовує застосунок).
// failOn: { op: 'insert' | 'update' | 'delete' | 'select', error } для симуляції помилок.
export const createFakeClient = (initial = [], { failOn = null } = {}) => {
  const state = { rows: initial.map(r => ({ ...r })), nextId: 1000 }
  const calls = []

  const likeToRegex = p => new RegExp('^' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*') + '$', 's')

  const from = () => {
    const q = { op: 'select', filters: [], payload: null, limitN: null, cols: '*' }
    const run = () => {
      calls.push(`${q.op}`)
      if (failOn && failOn.op === q.op) return { data: null, error: failOn.error }
      const match = r => q.filters.every(f => f(r))
      if (q.op === 'select') {
        let data = state.rows.filter(match).map(r => ({ ...r }))
        if (q.limitN !== null) data = data.slice(0, q.limitN)
        return { data, error: null }
      }
      if (q.op === 'insert') {
        for (const r of q.payload) state.rows.push({ id: state.nextId++, variant: null, brand: null, serial: null, ...r })
        return { data: null, error: null }
      }
      if (q.op === 'update') {
        state.rows.filter(match).forEach(r => Object.assign(r, q.payload))
        return { data: null, error: null }
      }
      state.rows = state.rows.filter(r => !match(r))
      return { data: null, error: null }
    }
    const api = {
      select(cols) { if (q.op === 'select') q.cols = cols; return api },
      insert(p) { q.op = 'insert'; q.payload = p; return api },
      update(p) { q.op = 'update'; q.payload = p; return api },
      delete() { q.op = 'delete'; return api },
      eq(k, v) { q.filters.push(r => r[k] === v); return api },
      neq(k, v) { q.filters.push(r => r[k] !== v); return api },
      like(k, p) { const re = likeToRegex(p); q.filters.push(r => re.test(String(r[k]))); return api },
      limit(n) { q.limitN = n; return api },
      then(res, rej) { return Promise.resolve(run()).then(res, rej) }
    }
    return api
  }
  return {
    from,
    channel: () => ({ on() { return this }, subscribe() { return this } }),
    removeChannel() {},
    state,
    calls
  }
}
