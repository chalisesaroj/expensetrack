# Budget Book

A personal and household annual budget tracker and expense ledger rewritten as a modern React SPA using TypeScript and Vite.

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

- **Income & Settings**:
  - Multi-source income tracking (Mine, Wife, Rent) with annual totals
  - Customizable budget year dates
  - Browser local persistence with automatic schema migrations
  - JSON backup download and restore feature
  - Reset to starting defaults

## Tech Stack

- **Framework**: React 18
- **Language**: TypeScript
- **Bundler**: Vite
- **Styling**: Native CSS with light & dark theme mode support
