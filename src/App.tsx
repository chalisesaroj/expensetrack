import React from 'react';
import { useBudget } from './context/BudgetContext';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { EntriesTab } from './components/EntriesTab';
import { BudgetTab } from './components/BudgetTab';
import { IncomeTab } from './components/IncomeTab';
import { Toast } from './components/Toast';

export const AppContent: React.FC = () => {
  const { tab } = useBudget();

  return (
    <div id="app">
      <Header />
      <main className="stack" role="tabpanel" aria-labelledby={`tab-${tab}`}>
        {tab === 'overview' && <OverviewTab />}
        {tab === 'entries' && <EntriesTab />}
        {tab === 'budget' && <BudgetTab />}
        {tab === 'income' && <IncomeTab />}
      </main>
      <Toast />
    </div>
  );
};

export default AppContent;
