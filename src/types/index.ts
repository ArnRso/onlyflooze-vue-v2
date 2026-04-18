export interface Category {
  id: string
  user_id: string
  name: string
  icon: string | null
  color: string | null
  is_income: boolean
  created_at: string
}

export interface Account {
  id: string
  user_id: string
  name: string
  bank: string | null
  currency: string
  created_at: string
}

export type RecurringFrequency = 'monthly' | 'quarterly' | 'annual' | 'weekly'
export type MonthEndBehavior = 'last_or_first' | 'last' | 'first'

export interface RecurringPattern {
  id: string
  user_id: string
  label: string
  label_pattern: string | null
  category_id: string | null
  expected_amount: number | null
  amount_tolerance: number
  frequency: RecurringFrequency
  day_of_month: number | null
  day_tolerance: number
  month_end_behavior: MonthEndBehavior
  is_income: boolean
  is_active: boolean
  created_at: string
  updated_at: string
  category?: Category
}

export interface Transaction {
  id: string
  user_id: string
  account_id: string | null
  external_id: string | null
  date: string
  amount: number
  label: string
  label_normalized: string | null
  category_id: string | null
  recurring_pattern_id: string | null
  is_recurring: boolean
  is_ignored: boolean
  ml_category_score: number | null
  note: string | null
  created_at: string
  category?: Category
  recurring_pattern?: RecurringPattern
  account?: Account
}

export interface BudgetGoal {
  id: string
  user_id: string
  category_id: string
  month: string
  amount: number
  created_at: string
  category?: Category
}

export interface MlTrainingData {
  id: string
  user_id: string
  label_normalized: string
  category_id: string
  confirmed_at: string
  category?: Category
}

export interface MonthlySummaryRow {
  category_id: string
  category_name: string
  total: number
  goal: number | null
  tx_count: number
}

export interface RawTransaction {
  external_id: string
  date: string
  amount: number
  label: string
}

export interface MlPrediction {
  category_id: string
  confidence: number
  label: string
}

export interface RecurringMatchResult {
  pattern: RecurringPattern
  score: number
}
