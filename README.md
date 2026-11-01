# Budget Book (Expense Track)

A personal and household annual budget tracker and collective family expense/income ledger built as a modern React SPA using TypeScript, Vite, and Supabase PostgreSQL.

## Live Deployment

- **GitHub Pages URL**: [https://chalisesaroj.github.io/expensetrack/](https://chalisesaroj.github.io/expensetrack/)
- **Repository**: [https://github.com/chalisesaroj/expensetrack](https://github.com/chalisesaroj/expensetrack)

## Key Features

- **Collective Family Income & Expense Tracking**:
  - Configurable family members / earners (e.g. Saroj, Wife, and additional members).
  - Transactional income recording by source: **Salary**, **Consulting**, **Travel Order**, and **Miscellaneous**.
  - Track who received each income and who paid for each expense.
  - Collective family balance sheet showing each person's income, expenses, and net balance.

- **Overview Dashboard**:
  - Live projected year-end savings calculation (surplus/deficit/break-even)
  - Visual comparison bars comparing Annual Income, Total Budget, and Actual Spent
  - Family balance breakdown card comparing earnings vs. spendings per person
  - Remaining balances by category with color-coded warning/over-budget pills

- **Entries & Spending Tracker**:
  - Quick spending entry form with "Spent by" family member selector
  - Filterable transaction history by Category and by Family Member
  - Double-click delete safety
  - Custom date-range CSV report export including member details

- **Budget Management**:
  - Inline category renaming and annual budget adjustments
  - Monthly budget breakdowns and remaining balances
  - Add custom categories
  - Safe category deletion protection

- **Supabase Cloud Security**:
  - 100% cloud-stored in PostgreSQL with Row Level Security (RLS)
  - Auth-gated access (only signed-in users can view and edit data)
  - JSON backup download and restore

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **PWA**: Installable on Android, iOS, and Desktop
- **Database / Auth**: Supabase (PostgreSQL with Row Level Security)
- **Deployment**: GitHub Pages via GitHub Actions
