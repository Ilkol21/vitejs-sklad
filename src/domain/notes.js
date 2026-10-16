// Примітки при зливанні двох рядків: нова примітка додається через «; », якщо її ще немає
export const mergeNotes = (existingNotes, extraNotes) => {
  const extra = String(extraNotes).trim()
  if (!extra) return existingNotes || ''
  if (!existingNotes) return extra
  return existingNotes.includes(extra) ? existingNotes : `${existingNotes}; ${extra}`
}
