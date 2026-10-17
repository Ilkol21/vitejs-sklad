import * as XLSX from 'xlsx'
import * as itemsRepository from '../api/itemsRepository.js'
import { buildReportRows, buildSummaryRows, positionLabel } from '../domain/report.js'
import { failure, success } from './result.js'

const REPORT_COLUMN_WIDTHS = [18, 14, 28, 26, 16, 18, 12, 10, 6, 11, 28, 28]
const SUMMARY_COLUMN_WIDTHS = [18, 14, 28, 26, 11, 11, 10, 10, 6, 11]
const TOTAL_COLUMN_WIDTHS = [14, 14, 28, 26, 11, 11, 10, 10, 6, 11]

const appendSheet = (workbook, rows, widths, sheetName) => {
  const sheet = XLSX.utils.json_to_sheet(rows)
  sheet['!cols'] = widths.map(wch => ({ wch }))
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName)
}

// Ім'я файлу: Звіт_Склад_<підрозділ>_<позиція>_<дата>.xlsx
export const reportFileName = (unitName, reportPosition, date = new Date()) => {
  const prefix = unitName ? `_${unitName.replace(/\s+/g, '')}` : ''
  const dateStr = date.toLocaleDateString('uk-UA').replace(/\./g, '-')
  const posPart = reportPosition ? `_${positionLabel(reportPosition).replace(/\s+/g, '')}` : '_УсіПозиції'
  return `Звіт_Склад${prefix}${posPart}_${dateStr}.xlsx`
}

// Книга з аркушами: «Облік майна», «Підсумок» і (для кількох позицій) «Разом»
export const buildWorkbook = items => {
  const wb = XLSX.utils.book_new()
  appendSheet(wb, buildReportRows(items), REPORT_COLUMN_WIDTHS, 'Облік майна')
  appendSheet(wb, buildSummaryRows(items, true), SUMMARY_COLUMN_WIDTHS, 'Підсумок')
  if (new Set(items.map(i => i.position_name)).size > 1) {
    appendSheet(wb, buildSummaryRows(items, false), TOTAL_COLUMN_WIDTHS, 'Разом')
  }
  return wb
}

// Вивантаження звіту: усі рядки, зокрема з кількістю 0 (це позначка «немає»)
export const exportExcel = async ({ reportPosition, unitName }, repo = itemsRepository) => {
  try {
    const { data: allItems, error } = await repo.fetchAll(reportPosition)
    if (error) throw error

    if (!allItems || !allItems.length) {
      return failure(reportPosition
        ? `На позиції «${positionLabel(reportPosition)}» немає майна для звіту`
        : 'Немає майна для звіту')
    }

    XLSX.writeFile(buildWorkbook(allItems), reportFileName(unitName, reportPosition))
    return success('Excel файл успішно завантажено!')
  } catch (err) {
    console.error('EXCEL ERROR:', err)
    return failure('Помилка вивантаження Excel!')
  }
}
