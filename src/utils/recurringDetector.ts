import { parseISO, differenceInDays, getDate } from 'date-fns'
import { normalizeLabel } from './labelNormalizer'
import { matchesDayWindow } from './dateWindow'
import type { RecurringPattern, Transaction, RecurringMatchResult } from '@/types'

const SCORE_THRESHOLD = 0.7

function matchesLabelPattern(normalized: string, pattern: RecurringPattern): boolean {
  if (!pattern.label_pattern) {
    return normalized.includes(normalizeLabel(pattern.label))
  }
  try {
    return new RegExp(pattern.label_pattern, 'i').test(normalized)
  } catch {
    return normalized.includes(pattern.label_pattern.toUpperCase())
  }
}

function amountScore(txAmount: number, pattern: RecurringPattern): number {
  if (pattern.expected_amount === null) return 1

  const diff = Math.abs(Math.abs(txAmount) - Math.abs(pattern.expected_amount))
  const tolerance = Math.abs(pattern.expected_amount) * pattern.amount_tolerance

  if (diff <= tolerance) {
    return 1 - (diff / tolerance) * 0.3
  }
  return 0
}

/**
 * Passe 1 : match une transaction importée contre les patterns existants.
 * Retourne le meilleur match au-dessus du seuil, ou null.
 */
export function matchRecurringPattern(
  tx: { label: string; amount: number; date: string },
  patterns: RecurringPattern[]
): RecurringMatchResult | null {
  const normalized = normalizeLabel(tx.label)
  const txDate = parseISO(tx.date)
  let best: RecurringMatchResult | null = null

  for (const pattern of patterns) {
    if (!pattern.is_active) continue

    const labelMatch = matchesLabelPattern(normalized, pattern)
    if (!labelMatch) continue

    const aScore = amountScore(tx.amount, pattern)
    if (aScore === 0) continue

    const dayMatch = matchesDayWindow(txDate, pattern)
    const dayScore = dayMatch ? 1 : 0.5

    const score = 0.5 * 1 + 0.3 * aScore + 0.2 * dayScore

    if (score >= SCORE_THRESHOLD && (!best || score > best.score)) {
      best = { pattern, score }
    }
  }

  return best
}

export interface SuggestedPattern {
  label: string
  label_normalized: string
  frequency: 'monthly' | 'quarterly' | 'weekly'
  day_of_month: number
  expected_amount: number
  amount_variance: number
  occurrences: number
}

/**
 * Passe 2 : analyse l'historique des transactions pour détecter de nouveaux patterns.
 * Retourne des suggestions à proposer à l'utilisateur.
 */
export function detectNewPatterns(transactions: Transaction[]): SuggestedPattern[] {
  const groups = new Map<string, Transaction[]>()

  for (const tx of transactions) {
    if (tx.is_recurring || tx.is_ignored) continue
    const key = tx.label_normalized ?? normalizeLabel(tx.label)
    if (!key) continue
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(tx)
  }

  const suggestions: SuggestedPattern[] = []

  for (const [label, txs] of groups) {
    if (txs.length < 3) continue

    const sorted = [...txs].sort((a, b) => a.date.localeCompare(b.date))
    const dates = sorted.map(t => parseISO(t.date))

    const intervals: number[] = []
    for (let i = 1; i < dates.length; i++) {
      intervals.push(differenceInDays(dates[i], dates[i - 1]))
    }

    const medianInterval = intervals.sort((a, b) => a - b)[Math.floor(intervals.length / 2)]

    let frequency: 'monthly' | 'quarterly' | 'weekly' | null = null
    if (medianInterval >= 25 && medianInterval <= 35) frequency = 'monthly'
    else if (medianInterval >= 83 && medianInterval <= 97) frequency = 'quarterly'
    else if (medianInterval >= 6 && medianInterval <= 8) frequency = 'weekly'

    if (!frequency) continue

    const amounts = sorted.map(t => Math.abs(t.amount))
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length
    const variance = Math.sqrt(
      amounts.reduce((s, a) => s + Math.pow(a - avgAmount, 2), 0) / amounts.length
    ) / avgAmount

    if (variance > 0.5) continue

    const days = dates.map(d => getDate(d))
    const avgDay = Math.round(days.reduce((a, b) => a + b, 0) / days.length)

    suggestions.push({
      label,
      label_normalized: label,
      frequency,
      day_of_month: avgDay,
      expected_amount: avgAmount,
      amount_variance: variance,
      occurrences: txs.length
    })
  }

  return suggestions
}
