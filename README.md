# Budget Book (Expense Track)

A personal and household annual budget tracker and expense ledger built as a modern React SPA using TypeScript, Vite, and Supabase PostgreSQL.

## Live Deployment

- **GitHub Pages URL**: [https://chalisesaroj.github.io/expensetrack/](https://chalisesaroj.github.io/expensetrack/)
- **Repository**: [https://github.com/chalisesaroj/expensetrack](https://github.com/chalisesaroj/expensetrack)

## Features

- **Overview Dashboard**:
  - Live projected year-end savings calculation (surplus/deficit/break-even)
  - Visual comparison bars comparing Annual Income, Total Budget, and Actual Spent
  - Visual pace markers against elapsed year progress
  - Remaining balances by category with color-coded warning/over-budget pills

- **Entries & Spending Tracker**:
  - Quick spending entry form with instant remaining budget calculation preview
  - Filterable transaction history with edit and double-click delete protection
  - Custom date-range CSV report export compatible with Excel and Google Sheets

- **Budget Management**:
  - Inline category renaming and annual budget adjustments
  - Monthly budget breakdowns and remaining balances
  - Add custom categories
  - Safe category deletion (prevents accidental deletion of categories with active entries)

- **Income, Supabase Cloud Database & Settings**:
  - Multi-source income tracking (Mine, Wife, Rent) with annual totals
  - Customizable budget year dates
  - Free Supabase PostgreSQL Cloud Sync with real-time auto-saving
  - Browser local persistence with automatic schema migrations
  - JSON backup download and restore feature
  - Reset to starting defaults

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **Database / Auth**: Supabase (PostgreSQL with Row Level Security)
- **Deployment**: GitHub Pages via GitHub Actions
- **Styling**: Native CSS with light & dark theme mode support
