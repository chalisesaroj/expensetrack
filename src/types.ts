export interface IncomeSourceConfig {
  salary: number;
  other: number;
}

export interface BudgetConfig {
  periodStart: string;
  periodEnd: string;
  income: {
    me: IncomeSourceConfig;
    wife: IncomeSourceConfig;
    rent: IncomeSourceConfig;
    [key: string]: IncomeSourceConfig;
  };
}

export interface Category {
  id: string;
  name: string;
  budget: number;
  order: number;
}

export interface SpendEntry {
  id: string;
  cat: string;
  amount: number;
  date: string;
  note: string;
  created?: number;
}

export interface SpendFormState {
  cat: string;
  amount: string;
  date: string;
  note: string;
  edit: string | null;
}

export interface Calculations {
  income: number;
  per: Record<string, { s: number; o: number; t: number }>;
  by: Record<string, number>;
  spent: number;
  budget: number;
  proj: number;
  frac: number;
  projSave: number;
  planSave: number;
  bestSave: number;
}

export type TabType = 'overview' | 'entries' | 'budget' | 'income';
