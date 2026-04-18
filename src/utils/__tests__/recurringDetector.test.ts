import { describe, it, expect } from 'vitest'
import { matchRecurringPattern, detectNewPatterns } from '../recurringDetector'
import type { RecurringPattern, Transaction } from '@/types'

function makePattern(overrides: Partial<RecurringPattern> = {}): RecurringPattern {
  return {
    id: 'p1',
    user_id: 'u1',
    label: 'EDF',
    label_pattern: null,
    category_id: null,
    expected_amount: -85,
    amount_tolerance: 0.2,
    frequency: 'monthly',
    day_of_month: 15,
    day_tolerance: 3,
    month_end_behavior: 'last_or_first',
    is_income: false,
    is_active: true,
    created_at: '',
    updated_at: '',
    ...overrides
  }
}

function makeTx(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 't1',
    user_id: 'u1',
    account_id: null,
    external_id: 'ext1',
    date: '2024-03-15',
    amount: -85,
    label: 'PRLV SEPA EDF ELECTRICITE 123456789',
    label_normalized: 'EDF ELECTRICITE',
    category_id: null,
    recurring_pattern_id: null,
    is_recurring: false,
    is_ignored: false,
    ml_category_score: null,
    note: null,
    created_at: '',
    ...overrides
  }
}

describe('matchRecurringPattern', () => {
  it('retourne null si aucun pattern', () => {
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -85, date: '2024-03-15' },
      []
    )
    expect(result).toBeNull()
  })

  it('matche un pattern EDF exact', () => {
    const pattern = makePattern()
    const result = matchRecurringPattern(
      { label: 'PRLV SEPA EDF ELECTRICITE 123456789', amount: -85, date: '2024-03-15' },
      [pattern]
    )
    expect(result).not.toBeNull()
    expect(result?.pattern.id).toBe('p1')
    expect(result?.score).toBeGreaterThanOrEqual(0.7)
  })

  it('ignore les patterns inactifs', () => {
    const pattern = makePattern({ is_active: false })
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -85, date: '2024-03-15' },
      [pattern]
    )
    expect(result).toBeNull()
  })

  it('rejette si montant hors tolérance', () => {
    const pattern = makePattern({ expected_amount: -85, amount_tolerance: 0.1 })
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -200, date: '2024-03-15' },
      [pattern]
    )
    expect(result).toBeNull()
  })

  it('accepte si montant dans la tolérance de 20%', () => {
    const pattern = makePattern({ expected_amount: -85, amount_tolerance: 0.2 })
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -100, date: '2024-03-15' }, // +17.6% → dans 20%
      [pattern]
    )
    expect(result).not.toBeNull()
  })

  it('accepte si expected_amount est null (tolérance infinie)', () => {
    const pattern = makePattern({ expected_amount: null })
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -9999, date: '2024-03-15' },
      [pattern]
    )
    expect(result).not.toBeNull()
  })

  it('utilise label_pattern comme regex', () => {
    // label_pattern couvre EDF et ENGIE, montant compatible avec expected_amount -85 ±20%
    const pattern = makePattern({ label: 'EDF', label_pattern: 'EDF|ENGIE', expected_amount: -80 })
    const result = matchRecurringPattern(
      { label: 'PRLV SEPA ENGIE GAZ 987654', amount: -80, date: '2024-03-15' },
      [pattern]
    )
    expect(result).not.toBeNull()
  })

  it('retourne le meilleur match parmi plusieurs patterns', () => {
    const p1 = makePattern({ id: 'p1', label: 'EDF', expected_amount: -85 })
    const p2 = makePattern({ id: 'p2', label: 'EDF', expected_amount: -90, amount_tolerance: 0.3 })
    const result = matchRecurringPattern(
      { label: 'EDF', amount: -85, date: '2024-03-15' },
      [p1, p2]
    )
    expect(result?.pattern.id).toBe('p1') // p1 plus proche en montant
  })

  it('matche un revenu (salaire)', () => {
    const pattern = makePattern({
      label: 'SALAIRE',
      expected_amount: 2500,
      is_income: true,
      day_of_month: 28,
      day_tolerance: 3
    })
    const result = matchRecurringPattern(
      { label: 'VIR SALAIRE MARS ENTREPRISE', amount: 2490, date: '2024-03-28' },
      [pattern]
    )
    expect(result).not.toBeNull()
  })

  it('salaire le 1er du mois suivant matche quand même (last_or_first)', () => {
    const pattern = makePattern({
      label: 'SALAIRE',
      expected_amount: 2500,
      day_of_month: 28,
      day_tolerance: 3,
      month_end_behavior: 'last_or_first'
    })
    const result = matchRecurringPattern(
      { label: 'SALAIRE ENTREPRISE', amount: 2500, date: '2024-04-01' },
      [pattern]
    )
    expect(result).not.toBeNull()
  })
})

describe('detectNewPatterns', () => {
  it('retourne un tableau vide si pas assez de transactions', () => {
    const txs = [
      makeTx({ label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-01-15' }),
      makeTx({ label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-02-15' })
    ]
    expect(detectNewPatterns(txs)).toEqual([])
  })

  it('détecte un pattern mensuel à partir de 3 occurrences', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-01-15', amount: -13.99 }),
      makeTx({ id: 't2', external_id: 'e2', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-02-15', amount: -13.99 }),
      makeTx({ id: 't3', external_id: 'e3', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-03-15', amount: -13.99 })
    ]
    const suggestions = detectNewPatterns(txs)
    expect(suggestions.length).toBe(1)
    expect(suggestions[0].frequency).toBe('monthly')
    expect(suggestions[0].label).toBe('NETFLIX')
    expect(suggestions[0].occurrences).toBe(3)
  })

  it('ignore les transactions déjà marquées is_recurring', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-01-15', is_recurring: true }),
      makeTx({ id: 't2', external_id: 'e2', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-02-15', is_recurring: true }),
      makeTx({ id: 't3', external_id: 'e3', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-03-15', is_recurring: true })
    ]
    expect(detectNewPatterns(txs)).toEqual([])
  })

  it('ignore les transactions is_ignored', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-01-15', is_ignored: true }),
      makeTx({ id: 't2', external_id: 'e2', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-02-15', is_ignored: true }),
      makeTx({ id: 't3', external_id: 'e3', label: 'NETFLIX', label_normalized: 'NETFLIX', date: '2024-03-15', is_ignored: true })
    ]
    expect(detectNewPatterns(txs)).toEqual([])
  })

  it('rejette un pattern avec variance de montant > 50%', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'EDF', label_normalized: 'EDF', date: '2024-01-15', amount: -10 }),
      makeTx({ id: 't2', external_id: 'e2', label: 'EDF', label_normalized: 'EDF', date: '2024-02-15', amount: -200 }),
      makeTx({ id: 't3', external_id: 'e3', label: 'EDF', label_normalized: 'EDF', date: '2024-03-15', amount: -500 })
    ]
    expect(detectNewPatterns(txs)).toEqual([])
  })

  it('détecte le jour moyen du mois correctement', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'LOYER', label_normalized: 'LOYER', date: '2024-01-01', amount: -900 }),
      makeTx({ id: 't2', external_id: 'e2', label: 'LOYER', label_normalized: 'LOYER', date: '2024-02-01', amount: -900 }),
      makeTx({ id: 't3', external_id: 'e3', label: 'LOYER', label_normalized: 'LOYER', date: '2024-03-01', amount: -900 })
    ]
    const suggestions = detectNewPatterns(txs)
    expect(suggestions[0].day_of_month).toBe(1)
  })

  it('détecte un pattern hebdomadaire', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'SPORT', label_normalized: 'SPORT', date: '2024-01-01', amount: -20 }),
      makeTx({ id: 't2', external_id: 'e2', label: 'SPORT', label_normalized: 'SPORT', date: '2024-01-08', amount: -20 }),
      makeTx({ id: 't3', external_id: 'e3', label: 'SPORT', label_normalized: 'SPORT', date: '2024-01-15', amount: -20 })
    ]
    const suggestions = detectNewPatterns(txs)
    expect(suggestions.length).toBe(1)
    expect(suggestions[0].frequency).toBe('weekly')
  })

  it('ne détecte pas de pattern pour des intervalles aléatoires', () => {
    const txs = [
      makeTx({ id: 't1', external_id: 'e1', label: 'RESTO', label_normalized: 'RESTO', date: '2024-01-03', amount: -25 }),
      makeTx({ id: 't2', external_id: 'e2', label: 'RESTO', label_normalized: 'RESTO', date: '2024-01-19', amount: -30 }),
      makeTx({ id: 't3', external_id: 'e3', label: 'RESTO', label_normalized: 'RESTO', date: '2024-02-11', amount: -28 })
    ]
    expect(detectNewPatterns(txs)).toEqual([])
  })
})
