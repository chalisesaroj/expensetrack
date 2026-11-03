import React from 'react';
import { useBudget } from '../context/BudgetContext';

export const DatabaseSetupBanner: React.FC = () => {
  const { needsSchemaMigration, openSchemaModal } = useBudget();

  if (!needsSchemaMigration) return null;

  return (
    <div
      style={{
        background: 'var(--warn-bg)',
        border: '1px solid var(--warn)',
        borderRadius: 8,
        padding: '12px 16px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: 16,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ fontSize: 20 }}>⚙️</span>
        <div>
          <b style={{ color: 'var(--warn)', fontSize: 14 }}>
            Supabase Schema Update Needed
          </b>
          <p style={{ fontSize: 13, color: 'var(--fg)', marginTop: 2 }}>
            Your entries are currently saving in fallback mode. Run the 10-second SQL script in Supabase to enable the dedicated <b>member</b> column and <b>incomes</b> table.
          </p>
        </div>
      </div>

      <button
        type="button"
        className="btn primary small"
        onClick={openSchemaModal}
        style={{ whiteSpace: 'nowrap' }}
      >
        View & Copy SQL Script
      </button>
    </div>
  );
};
