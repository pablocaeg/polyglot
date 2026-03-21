import type { DifficultWord } from '../types'

export function exportToCSV(words: DifficultWord[]): void {
  const header = 'Word,Translation,Context,Context Translation,Mastery,Note,Created'
  const rows = words.map((w) =>
    [
      csvEscape(w.word),
      csvEscape(w.translation),
      csvEscape(w.context),
      csvEscape(w.contextTranslation),
      w.mastery || 'new',
      csvEscape(w.note || ''),
      new Date(w.createdAt).toISOString().slice(0, 10),
    ].join(',')
  )

  const content = [header, ...rows].join('\n')
  download(content, 'polyglot-words.csv', 'text/csv')
}

export function exportToAnki(words: DifficultWord[]): void {
  // Anki tab-separated format: front\tback\ttags
  const rows = words.map((w) =>
    [
      w.word,
      `${w.translation}${w.note ? ` (${w.note})` : ''}`,
      `polyglot::${w.mastery || 'new'}`,
    ].join('\t')
  )

  const content = rows.join('\n')
  download(content, 'polyglot-words.txt', 'text/plain')
}

function csvEscape(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}

function download(content: string, filename: string, type: string): void {
  const blob = new Blob([content], { type: `${type};charset=utf-8` })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
