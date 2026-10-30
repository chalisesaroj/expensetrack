import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { TABS } from '../constants';
import { fmtD, money, verdict } from '../utils';
import { TabType } from '../types';

export const Header: React.FC = () => {
  const { tab, setTab, cfg, calculations } = useBudget();
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
        <div className="headfig">
          <span className="label">Projected year-end</span>
          <b className={`num ${v[1]}`}>
            {v[0]} {money(Math.abs(calculations.projSave))}
          </b>
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
