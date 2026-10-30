import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { money, verdict } from '../utils';

export const Hero: React.FC = () => {
  const { calculations: c } = useBudget();
  const v = verdict(c.projSave);
  const p = verdict(c.planSave);
  const b = verdict(c.bestSave);

  const mx = Math.max(c.income, c.budget, c.spent, 1);
  const w = (x: number) => Math.min(100, (x / mx) * 100).toFixed(1) + '%';
  const rate = c.income > 0 ? (c.projSave / c.income) * 100 : 0;

  return (
    <section className="card hero" aria-labelledby="h-sum">
      <div className="hero-main">
        <h2 id="h-sum" className="label" style={{ fontFamily: 'var(--font-body)' }}>
          Estimated saving right now
        </h2>
        <div className={`big num ${v[1]}`}>{money(c.projSave)}</div>
        <p className={`verdict ${v[1]}`}>
          {v[0]}
          {c.income > 0 ? ` · ${rate.toFixed(1)}% of income` : ''}
        </p>
        {c.income === 0 && (
          <p className="note">
            <b>No income entered yet.</b> Add salary and other income on the Income tab to see your saving estimate.
          </p>
        )}
        <p className="note">
          Projection assumes each category ends the year at its full budget, or at what you have already spent if that is higher.
        </p>
      </div>

      <div>
        <dl className="rows">
          <dt>Annual income</dt>
          <dd className="num">{money(c.income)}</dd>
          <dt>Total budget</dt>
          <dd className="num">{money(c.budget)}</dd>
          <dt>Spent so far</dt>
          <dd className="num">{money(c.spent)}</dd>
          <dt>Planned ({p[0].toLowerCase()}, income − budget)</dt>
          <dd className={`num ${p[1]}`}>{money(c.planSave)}</dd>
          <dt>If you spend nothing more ({b[0].toLowerCase()})</dt>
          <dd className={`num ${b[1]}`}>{money(c.bestSave)}</dd>
        </dl>

        <div className="compare" aria-hidden="true">
          <div className="cmp">
            <span>Income</span>
            <div className="track">
              <div className="fill" style={{ width: w(c.income) }}></div>
            </div>
          </div>
          <div className="cmp">
            <span>Budget</span>
            <div className="track">
              <div className="fill b" style={{ width: w(c.budget) }}></div>
            </div>
          </div>
          <div className="cmp">
            <span>Spent</span>
            <div className="track">
              <div className="fill s" style={{ width: w(c.spent) }}></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
