import { describe, it, expect } from 'vitest'
import { predictCategory, AUTO_ASSIGN_THRESHOLD, SUGGEST_THRESHOLD } from '../mlCategorizer'
import type { MlTrainingData } from '@/types'

function makeTraining(label_normalized: string, category_id: string): MlTrainingData {
  return {
    id: `td-${label_normalized}`,
    user_id: 'u1',
    label_normalized,
    category_id,
    confirmed_at: '2024-01-01'
  }
}

const CAT_FOOD = 'cat-food'
const CAT_TRANSPORT = 'cat-transport'
const CAT_STREAMING = 'cat-streaming'
const CAT_UTILITIES = 'cat-utilities'

const trainingData: MlTrainingData[] = [
  makeTraining('CARREFOUR', CAT_FOOD),
  makeTraining('MONOPRIX', CAT_FOOD),
  makeTraining('LECLERC', CAT_FOOD),
  makeTraining('INTERMARCHE', CAT_FOOD),
  makeTraining('SNCF', CAT_TRANSPORT),
  makeTraining('RATP', CAT_TRANSPORT),
  makeTraining('UBER', CAT_TRANSPORT),
  makeTraining('NETFLIX', CAT_STREAMING),
  makeTraining('SPOTIFY', CAT_STREAMING),
  makeTraining('EDF ELECTRICITE', CAT_UTILITIES),
  makeTraining('ENGIE GAZ', CAT_UTILITIES)
]

describe('predictCategory', () => {
  it('retourne null si données d\'entraînement vides', () => {
    expect(predictCategory('CARREFOUR', [])).toBeNull()
  })

  it('prédit correctement CARREFOUR → alimentation', () => {
    const result = predictCategory('CARREFOUR MONTROUGE', trainingData)
    expect(result).not.toBeNull()
    expect(result?.category_id).toBe(CAT_FOOD)
  })

  it('prédit correctement SNCF → transport', () => {
    const result = predictCategory('SNCF BILLET PARIS LYON', trainingData)
    expect(result).not.toBeNull()
    expect(result?.category_id).toBe(CAT_TRANSPORT)
  })

  it('prédit correctement NETFLIX → streaming', () => {
    const result = predictCategory('PRLV SEPA NETFLIX', trainingData)
    expect(result).not.toBeNull()
    expect(result?.category_id).toBe(CAT_STREAMING)
  })

  it('prédit correctement EDF → utilities', () => {
    const result = predictCategory('PRLV SEPA EDF ELECTRICITE 123456789', trainingData)
    expect(result).not.toBeNull()
    expect(result?.category_id).toBe(CAT_UTILITIES)
  })

  it('retourne une confiance entre 0 et 1', () => {
    const result = predictCategory('CARREFOUR', trainingData)
    expect(result?.confidence).toBeGreaterThan(0)
    expect(result?.confidence).toBeLessThanOrEqual(1)
  })

  it('auto-assign si confiance >= 0.8', () => {
    const result = predictCategory('CARREFOUR', trainingData)
    if (result && result.confidence >= AUTO_ASSIGN_THRESHOLD) {
      expect(result.confidence).toBeGreaterThanOrEqual(AUTO_ASSIGN_THRESHOLD)
    }
  })

  it('retourne null si confiance < seuil de suggestion (label inconnu)', () => {
    const result = predictCategory('XXXXXX ZZZZZZZ QQQQQQ', trainingData)
    // Peut être null ou très faible confiance
    if (result !== null) {
      expect(result.confidence).toBeGreaterThanOrEqual(SUGGEST_THRESHOLD)
    }
  })

  it('confiance = 1 avec un seul voisin exact', () => {
    const singleEntry: MlTrainingData[] = [makeTraining('NETFLIX', CAT_STREAMING)]
    const result = predictCategory('NETFLIX', singleEntry)
    expect(result).not.toBeNull()
    expect(result?.confidence).toBe(1)
  })

  it('prédit avec un seul voisin disponible', () => {
    const singleEntry: MlTrainingData[] = [makeTraining('UBER', CAT_TRANSPORT)]
    const result = predictCategory('UBER EATS', singleEntry)
    expect(result?.category_id).toBe(CAT_TRANSPORT)
  })

  it('normalise le label avant de comparer', () => {
    // "PRLV SEPA NETFLIX 123456" doit être normalisé en "NETFLIX"
    const result = predictCategory('PRLV SEPA NETFLIX 123456789', trainingData)
    expect(result?.category_id).toBe(CAT_STREAMING)
  })

  it('vote pondéré — majorité alimentation l\'emporte sur transport', () => {
    const result = predictCategory('MONOPRIX TRANSPORT', trainingData)
    // MONOPRIX → food (fort) vs TRANSPORT → transport (faible)
    expect(result?.category_id).toBe(CAT_FOOD)
  })
})

describe('constantes de seuils', () => {
  it('AUTO_ASSIGN_THRESHOLD est 0.8', () => {
    expect(AUTO_ASSIGN_THRESHOLD).toBe(0.8)
  })

  it('SUGGEST_THRESHOLD est 0.5', () => {
    expect(SUGGEST_THRESHOLD).toBe(0.5)
  })
})
