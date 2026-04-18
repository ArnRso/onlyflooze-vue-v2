const PREFIXES_TO_REMOVE = /\b(PRLV|SEPA|VIR|CB|REF|REM|VIRT|CARTE|FRAIS|COMMISSION)\b/gi
const LONG_NUMBERS = /\b\d{6,}\b/g
const DATES_DDMM = /\b\d{2}[/-]\d{2}([/-]\d{2,4})?\b/g
const CARD_REFS = /\*{2,}\d{2,4}\b/g
const CONTRACT_REFS = /\b[A-Z]{2,}-[\d]+\b/g
const EXTRA_SPACES = /\s+/g

export function normalizeLabel(label: string): string {
  return label
    .toUpperCase()
    .replace(CARD_REFS, '')
    .replace(DATES_DDMM, '')
    .replace(LONG_NUMBERS, '')
    .replace(CONTRACT_REFS, '')
    .replace(PREFIXES_TO_REMOVE, '')
    .replace(EXTRA_SPACES, ' ')
    .trim()
}

export function tokenize(label: string): Set<string> {
  return new Set(
    normalizeLabel(label)
      .split(/\s+/)
      .filter(t => t.length > 1)
  )
}
