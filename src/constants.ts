export const KEY = 'budgetBook.v1';

export const DEFAULT_MEMBERS = ['Husband', 'Wife'];

export const DEFAULT_INCOME_SOURCES: string[] = [
  'Salary',
  'Consulting',
  'Travel Order',
  'Miscellaneous',
];

export const SRC: [string, string, string][] = [
  ['me', 'Mine', 'Annual salary'],
  ['wife', 'Wife', 'Annual salary'],
  ['rent', 'Rent', 'Annual rent'],
];

export const TABS: [string, string][] = [
  ['overview', 'Overview'],
  ['entries', 'Entries'],
  ['budget', 'Budget'],
  ['income', 'Income'],
];

/* Starting annual budgets. Edit them here or inside the app (Budget tab). */
export const DEFAULT_BUDGET: [string, number][] = [
  ['Car', 200000],
  ['SSF', 44400],
  ['Internet', 14800],
  ['Clothes', 20000],
  ['Restaurant', 85000],
  ['Travel', 40000],
  ['Medical', 25000],
  ['Parents welfare', 264000],
  ['Office food', 30000],
  ['Kids fee', 60000],
  ['Kids budget', 30000],
  ['Milk', 100800],
  ['Electronics', 50000],
  ['Phone recharge', 12000],
  ['Fruits / Vegetable', 180000],
  ['Gym', 26000],
  ['Gift / Tika tala', 25000],
  ['Dhukuti', 900000],
  ['Grocery', 1200000],
  ['Father welfare', 150000],
  ['Electricity and Drinking water', 36000],
  ['Buying new item in house', 150000],
  ['EMI', 0],
  ['Stock buy', 0],
];

/* Categories added after the first release. Existing saved data gets them once. */
export const ADDED_V2 = ['EMI', 'Stock buy'];

export const STATUS_TXT = {
  ok: 'On track',
  watch: 'Ahead of pace',
  over: 'Over budget',
};
