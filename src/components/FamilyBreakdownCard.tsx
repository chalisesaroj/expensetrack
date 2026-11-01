import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { money, verdict } from '../utils';
import { DEFAULT_MEMBERS } from '../constants';

export const FamilyBreakdownCard: React.FC = () => {
  const { cfg, calculations: c, setTab } = useBudget();
  const members = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;
  const sharedSpent = c.spentByMember['Shared'] || 0;

  return (
    <section className="card stack">
      <div className="row-between">
        <div>
          <h2>Collective Family Balance</h2>
          <p className="muted" style={{ fontSize: 13 }}>
            Tracking of income received, expenses spent, and net balance by each family member.
          </p>
        </div>
        <button
          type="button"
          className="btn small"
          onClick={() => setTab('income')}
        >
          Manage income & members
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))',
          gap: 14,
          marginTop: 4,
        }}
      >
        {members.map((m) => {
          const inc = c.incomeByMember[m] || 0;
          const sp = c.spentByMember[m] || 0;
          const net = inc - sp;
          const v = verdict(net);

          return (
            <div
              key={m}
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '14px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div className="row-between">
                <h3 style={{ fontSize: 17 }}>{m}</h3>
                <span className={`pill ${v[1] || 'ok'}`}>{v[0]}</span>
              </div>

              <dl className="rows" style={{ fontSize: 14 }}>
                <dt>Income earned</dt>
                <dd className="num good" style={{ fontWeight: 600 }}>
                  {money(inc)}
                </dd>
                <dt>Expenses paid</dt>
                <dd className="num bad">{money(sp)}</dd>
                <dt style={{ fontWeight: 600 }}>Net balance</dt>
                <dd className={`num ${v[1]}`} style={{ fontWeight: 700, fontSize: 16 }}>
                  {money(net)}
                </dd>
              </dl>
            </div>
          );
        })}

        {sharedSpent > 0 && (
          <div
            style={{
              background: 'var(--surface-2)',
              border: '1px dashed var(--line)',
              borderRadius: 8,
              padding: '14px 16px',
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div className="row-between">
              <h3 style={{ fontSize: 17, color: 'var(--muted)' }}>Shared / Household</h3>
              <span className="pill">Shared</span>
            </div>
            <dl className="rows" style={{ fontSize: 14 }}>
              <dt>Joint expenses</dt>
              <dd className="num bad">{money(sharedSpent)}</dd>
              <dt>Paid from</dt>
              <dd className="muted">Common Family Budget</dd>
            </dl>
          </div>
        )}
      </div>
    </section>
  );
};
