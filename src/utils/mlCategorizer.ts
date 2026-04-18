import { normalizeLabel, tokenize } from './labelNormalizer'
import type { MlTrainingData, MlPrediction } from '@/types'

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 && b.size === 0) return 1
  if (a.size === 0 || b.size === 0) return 0
  const intersection = new Set([...a].filter(t => b.has(t)))
  // Jaccard asymétrique : score basé sur le plus petit des deux sets.
  // Permet à "CARREFOUR MONTROUGE" de matcher "CARREFOUR" sans pénalité.
  const minSize = Math.min(a.size, b.size)
  return intersection.size / minSize
}

function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1]
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
      }
    }
  }
  return dp[m][n]
}

function normalizedLevenshtein(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  return levenshtein(a, b) / maxLen
}

function similarity(labelA: string, labelB: string): number {
  const tokensA = tokenize(labelA)
  const tokensB = tokenize(labelB)
  const jaccard = jaccardSimilarity(tokensA, tokensB)
  const lev = normalizedLevenshtein(labelA, labelB)
  return 0.6 * jaccard + 0.4 * (1 - lev)
}

const K = 5
export const AUTO_ASSIGN_THRESHOLD = 0.8
export const SUGGEST_THRESHOLD = 0.5

/**
 * Prédit la catégorie d'une transaction à partir des données d'entraînement.
 */
export function predictCategory(
  label: string,
  trainingData: MlTrainingData[]
): MlPrediction | null {
  if (trainingData.length === 0) return null

  const normalized = normalizeLabel(label)

  const scored = trainingData.map(entry => ({
    category_id: entry.category_id,
    score: similarity(normalized, entry.label_normalized)
  }))

  scored.sort((a, b) => b.score - a.score)
  const neighbors = scored.slice(0, K)

  if (neighbors.length === 0 || neighbors[0].score < SUGGEST_THRESHOLD) return null

  // Vote pondéré par score
  const votes = new Map<string, number>()
  for (const n of neighbors) {
    votes.set(n.category_id, (votes.get(n.category_id) ?? 0) + n.score)
  }

  const best = [...votes.entries()].sort((a, b) => b[1] - a[1])[0]
  const totalScore = neighbors.reduce((s, n) => s + n.score, 0)
  const confidence = best[1] / totalScore

  return {
    category_id: best[0],
    confidence,
    label: normalized
  }
}
