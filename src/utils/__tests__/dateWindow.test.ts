import { describe, it, expect } from 'vitest'
import { resolveBudgetMonth, matchesDayWindow } from '../dateWindow'
import { startOfMonth } from 'date-fns'
import type { RecurringPattern } from '@/types'

function makePattern(overrides: Partial<RecurringPattern> = {}): RecurringPattern {
  return {
    id: 'p1',
    user_id: 'u1',
    label: 'Test',
    label_pattern: null,
    category_id: null,
    expected_amount: -100,
    amount_tolerance: 0.2,
    frequency: 'monthly',
    day_of_month: 28,
    day_tolerance: 3,
    month_end_behavior: 'last_or_first',
    is_income: false,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides
  }
}

describe('matchesDayWindow', () => {
  it('retourne true si day_of_month est null', () => {
    const pattern = makePattern({ day_of_month: null })
    expect(matchesDayWindow(new Date('2024-03-15'), pattern)).toBe(true)
  })

  it('retourne true pour le jour exact', () => {
    const pattern = makePattern({ day_of_month: 15, day_tolerance: 0 })
    expect(matchesDayWindow(new Date('2024-03-15'), pattern)).toBe(true)
  })

  it('retourne true dans la tolérance', () => {
    const pattern = makePattern({ day_of_month: 15, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-03-13'), pattern)).toBe(true) // 15 - 2
    expect(matchesDayWindow(new Date('2024-03-18'), pattern)).toBe(true) // 15 + 3
  })

  it('retourne false hors tolérance', () => {
    const pattern = makePattern({ day_of_month: 15, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-03-11'), pattern)).toBe(false) // 15 - 4
    expect(matchesDayWindow(new Date('2024-03-19'), pattern)).toBe(false) // 15 + 4
  })

  it('salaire: le 31 mars est dans la fenêtre du pattern jour 28', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-03-31'), pattern)).toBe(true) // 28 + 3
  })

  it('salaire: le 1er avril est dans la fenêtre du pattern jour 28 (last_or_first)', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    // début de mois (jour 1) + expected >= 28 (daysInMonth - tolerance = 28)
    expect(matchesDayWindow(new Date('2024-04-01'), pattern)).toBe(true)
  })

  it('salaire: le 3 avril est dans la fenêtre (tolérance max)', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-04-03'), pattern)).toBe(true)
  })

  it('salaire: le 4 avril est hors fenêtre', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-04-04'), pattern)).toBe(false)
  })

  it('février: le 28 fév est accepté si pattern jour 31', () => {
    // daysInMonth(fév) = 28, expected 31 > 28, day=28 >= 28-3
    const pattern = makePattern({ day_of_month: 31, day_tolerance: 3 })
    expect(matchesDayWindow(new Date('2024-02-28'), pattern)).toBe(true)
  })

  it('pas de last_or_first: le 1er avril n\'est pas dans la fenêtre', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3, month_end_behavior: 'last' })
    expect(matchesDayWindow(new Date('2024-04-01'), pattern)).toBe(false)
  })
})

describe('resolveBudgetMonth', () => {
  it('rattache au mois courant si jour dans la tolérance', () => {
    const pattern = makePattern({ day_of_month: 15, day_tolerance: 3 })
    const result = resolveBudgetMonth(new Date('2024-03-14'), pattern)
    expect(result).toEqual(startOfMonth(new Date('2024-03-01')))
  })

  it('day_of_month null → mois courant', () => {
    const pattern = makePattern({ day_of_month: null })
    const result = resolveBudgetMonth(new Date('2024-03-15'), pattern)
    expect(result).toEqual(startOfMonth(new Date('2024-03-01')))
  })

  it('salaire du 31 → rattaché à mars', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    const result = resolveBudgetMonth(new Date('2024-03-31'), pattern)
    expect(result).toEqual(startOfMonth(new Date('2024-03-01')))
  })

  it('salaire du 1er avril → rattaché à mars (last_or_first)', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    const result = resolveBudgetMonth(new Date('2024-04-01'), pattern)
    expect(result).toEqual(startOfMonth(new Date('2024-03-01')))
  })

  it('salaire du 5 avril → rattaché à avril (hors fenêtre)', () => {
    const pattern = makePattern({ day_of_month: 28, day_tolerance: 3 })
    const result = resolveBudgetMonth(new Date('2024-04-05'), pattern)
    expect(result).toEqual(startOfMonth(new Date('2024-04-01')))
  })
})
