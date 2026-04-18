import { describe, it, expect } from 'vitest'
import { normalizeLabel, tokenize } from '../labelNormalizer'

describe('normalizeLabel', () => {
  it('passe en majuscules', () => {
    expect(normalizeLabel('edf')).toBe('EDF')
  })

  it('supprime les préfixes PRLV et SEPA', () => {
    expect(normalizeLabel('PRLV SEPA EDF 123456789')).toBe('EDF')
  })

  it('supprime les préfixes VIR, CB, REF', () => {
    expect(normalizeLabel('VIR SALAIRE ENTREPRISE')).toBe('SALAIRE ENTREPRISE')
    expect(normalizeLabel('CB CARREFOUR')).toBe('CARREFOUR')
    expect(normalizeLabel('REF 12345678 IMPOTS')).toBe('IMPOTS') // 8 chiffres → supprimé
    expect(normalizeLabel('REF 12345 IMPOTS')).toBe('12345 IMPOTS') // 5 chiffres → conservé
  })

  it('supprime les préfixes CARTE, FRAIS, COMMISSION', () => {
    expect(normalizeLabel('CARTE **1234 AMAZON')).toBe('AMAZON')
    expect(normalizeLabel('FRAIS DE TENUE COMPTE')).toBe('DE TENUE COMPTE')
    expect(normalizeLabel('COMMISSION BANQUE')).toBe('BANQUE')
  })

  it('supprime les références de carte **XXXX', () => {
    expect(normalizeLabel('PAIEMENT **5678 MONOPRIX')).toBe('PAIEMENT MONOPRIX')
  })

  it('supprime les nombres de 6 chiffres ou plus', () => {
    expect(normalizeLabel('EDF 123456789')).toBe('EDF')
    expect(normalizeLabel('EDF 12345')).toBe('EDF 12345') // 5 chiffres → conservé
  })

  it('supprime les dates DD/MM', () => {
    expect(normalizeLabel('LOYER 01/04')).toBe('LOYER')
    expect(normalizeLabel('LOYER 01/04/2024')).toBe('LOYER')
    expect(normalizeLabel('LOYER 01-04')).toBe('LOYER')
  })

  it('supprime les références de contrat TYPE-123', () => {
    expect(normalizeLabel('PRLV SEPA EDF CONTRAT-87654')).toBe('EDF')
  })

  it('réduit les espaces multiples', () => {
    expect(normalizeLabel('EDF   ELECTRICITE')).toBe('EDF ELECTRICITE')
  })

  it('trim les espaces en début et fin', () => {
    expect(normalizeLabel('  EDF  ')).toBe('EDF')
  })

  it('retourne une chaîne vide si tout est supprimé', () => {
    expect(normalizeLabel('PRLV SEPA 123456789')).toBe('')
  })

  it('gère une chaîne vide en entrée', () => {
    expect(normalizeLabel('')).toBe('')
  })

  it('exemple réel : prélèvement EDF', () => {
    expect(normalizeLabel('PRLV SEPA EDF ELECTRICITE 987654321 CONTRAT-12')).toBe('EDF ELECTRICITE')
  })

  it('exemple réel : virement salaire', () => {
    expect(normalizeLabel('VIR SALAIRE MARS 2024 SOCIETE EXAMPLE')).toBe('SALAIRE MARS 2024 SOCIETE EXAMPLE')
  })
})

describe('tokenize', () => {
  it('retourne un Set de tokens', () => {
    const tokens = tokenize('EDF ELECTRICITE')
    expect(tokens).toBeInstanceOf(Set)
    expect(tokens.has('EDF')).toBe(true)
    expect(tokens.has('ELECTRICITE')).toBe(true)
  })

  it('filtre les tokens de 1 caractère', () => {
    const tokens = tokenize('A EDF B')
    expect(tokens.has('A')).toBe(false)
    expect(tokens.has('B')).toBe(false)
    expect(tokens.has('EDF')).toBe(true)
  })

  it('élimine les doublons', () => {
    const tokens = tokenize('EDF EDF ELECTRICITE')
    expect(tokens.size).toBe(2)
  })

  it('retourne un Set vide pour une chaîne vide', () => {
    expect(tokenize('').size).toBe(0)
  })

  it('normalise avant de tokeniser', () => {
    const tokens = tokenize('PRLV SEPA EDF')
    expect(tokens.has('PRLV')).toBe(false)
    expect(tokens.has('SEPA')).toBe(false)
    expect(tokens.has('EDF')).toBe(true)
  })
})
