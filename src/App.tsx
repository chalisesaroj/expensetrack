import React from 'react';
import { useBudget } from './context/BudgetContext';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { EntriesTab } from './components/EntriesTab';
import { BudgetTab } from './components/BudgetTab';
import { IncomeTab } from './components/IncomeTab';
import { Toast } from './components/Toast';
import { AuthScreen } from './components/AuthScreen';

export const AppContent: React.FC = () => {
  const { user, loadingAuth, loadingData, tab } = useBudget();

  if (loadingAuth) {
    return (
      <div id="app" style={{ textAlign: 'center', paddingTop: 80 }}>
        <p className="muted" style={{ fontSize: 16 }}>Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <AuthScreen />
        <Toast />
      </>
    );
  }

  return (
    <div id="app">
      <Header />
      {loadingData ? (
        <div className="card" style={{ textAlign: 'center', padding: '40px 20px' }}>
          <p className="muted">Fetching your cloud ledger from Supabase…</p>
        </div>
      ) : (
        <main className="stack" role="tabpanel" aria-labelledby={`tab-${tab}`}>
          {tab === 'overview' && <OverviewTab />}
          {tab === 'entries' && <EntriesTab />}
          {tab === 'budget' && <BudgetTab />}
          {tab === 'income' && <IncomeTab />}
        </main>
      )}
      <Toast />
    </div>
  );
};

export default AppContent;
