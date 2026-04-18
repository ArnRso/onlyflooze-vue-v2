import { parseISO, getDaysInMonth, getDate, getMonth, getYear, startOfMonth, addMonths, subMonths } from 'date-fns'
import type { RecurringPattern } from '@/types'

/**
 * Détermine le mois budgétaire d'une transaction en tenant compte de la
 * tolérance sur les jours (gestion salaire fin de mois / début du suivant).
 *
 * Retourne le premier jour du mois budgétaire auquel rattacher la transaction.
 */
export function resolveBudgetMonth(txDate: Date, pattern: RecurringPattern): Date {
  const day = getDate(txDate)
  const expectedDay = pattern.day_of_month
  const tolerance = pattern.day_tolerance

  if (expectedDay === null) {
    return startOfMonth(txDate)
  }

  // Vérifier si la tx est dans la fenêtre du mois courant
  if (Math.abs(day - expectedDay) <= tolerance) {
    return startOfMonth(txDate)
  }

  // Cas fin de mois : tx du 28-31 ou début mois suivant (1-3)
  if (pattern.month_end_behavior === 'last_or_first') {
    const daysInMonth = getDaysInMonth(txDate)

    // TX en début de mois (1-3) → vérifier si appartient au mois précédent
    if (day <= tolerance) {
      const prevMonth = subMonths(txDate, 1)
      const daysInPrevMonth = getDaysInMonth(prevMonth)
      // Le jour attendu dans le mois précédent (ex: 28 ou dernier jour)
      const effectiveExpectedDay = Math.min(expectedDay, daysInPrevMonth)
      if (Math.abs(daysInPrevMonth - effectiveExpectedDay + day) <= tolerance) {
        return startOfMonth(prevMonth)
      }
    }

    // TX en fin de mois, le mois a moins de jours que le jour attendu
    if (expectedDay > daysInMonth && day === daysInMonth) {
      return startOfMonth(txDate)
    }
  }

  return startOfMonth(txDate)
}

/**
 * Vérifie si une transaction correspond à la fenêtre de date d'un pattern.
 */
export function matchesDayWindow(txDate: Date, pattern: RecurringPattern): boolean {
  const day = getDate(txDate)
  const expectedDay = pattern.day_of_month
  const tolerance = pattern.day_tolerance

  if (expectedDay === null) return true

  // Correspondance directe
  if (Math.abs(day - expectedDay) <= tolerance) return true

  // Fin de mois / début du suivant
  if (pattern.month_end_behavior === 'last_or_first') {
    const daysInMonth = getDaysInMonth(txDate)

    // TX en début de mois → peut appartenir au cycle du mois précédent
    if (day <= tolerance && expectedDay >= daysInMonth - tolerance) {
      return true
    }

    // Mois court : dernier jour du mois accepté si le jour attendu déborde
    if (expectedDay > daysInMonth && day >= daysInMonth - tolerance) {
      return true
    }
  }

  return false
}
