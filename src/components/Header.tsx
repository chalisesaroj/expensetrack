import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { TABS } from '../constants';
import { fmtD, money, verdict } from '../utils';
import { TabType } from '../types';
import { PWAInstallButton } from './PWAInstallButton';

export const Header: React.FC = () => {
  const { tab, setTab, cfg, calculations, user, signOut, needsSchemaMigration, openSchemaModal } = useBudget();
  const v = verdict(calculations.projSave);

  return (
    <>
      <header className="top">
        <div>
          <h1>Budget Book</h1>
          <p className="sub">
            Budget year {fmtD(cfg.periodStart)} to {fmtD(cfg.periodEnd)} · {Math.round(calculations.frac * 100)}% elapsed
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <div className="headfig">
            <span className="label">Projected year-end</span>
            <b className={`num ${v[1]}`}>
              {v[0]} {money(Math.abs(calculations.projSave))}
            </b>
          </div>
          <PWAInstallButton />
          {needsSchemaMigration && (
            <button
              type="button"
              className="btn small"
              onClick={openSchemaModal}
              style={{ background: 'var(--warn-bg)', borderColor: 'var(--warn)', color: 'var(--warn)' }}
              title="Click to view SQL script for Supabase"
            >
              ⚙️ DB Setup
            </button>
          )}
          {user && (
            <button
              type="button"
              className="btn small"
              onClick={signOut}
              title={`Signed in as ${user.email || user.id}`}
            >
              Sign out
            </button>
          )}
        </div>
      </header>
      <nav className="tabs" role="tablist" aria-label="Sections">
        {TABS.map(([tabId, label]) => (
          <button
            key={tabId}
            id={`tab-${tabId}`}
            role="tab"
            aria-selected={tab === tabId}
            onClick={() => setTab(tabId as TabType)}
          >
            {label}
          </button>
        ))}
      </nav>
    </>
  );
};
