import React from 'react';
import { useBudget } from '../context/BudgetContext';
import { STATUS_TXT } from '../constants';
import { money, num, status } from '../utils';

export const CategoryCards: React.FC = () => {
  const { cats, calculations: c } = useBudget();

  if (!cats.length) {
    return (
      <section className="card flat empty">
        No categories yet. Add your first one in the Budget tab.
      </section>
    );
  }

  return (
    <section className="stack" aria-labelledby="h-cats">
      <div className="row-between">
        <h2 id="h-cats">Remaining by category</h2>
        <span className="legend">
          <i></i>Even-pace marker for today
        </span>
      </div>

      <div className="cats">
        {cats.map((k) => {
          const b = num(k.budget);
          const s = c.by[k.id] || 0;
          const left = b - s;
          const st = status(s, b, c.frac);
          const pct = b > 0 ? Math.min(100, (s / b) * 100) : s > 0 ? 100 : 0;

          return (
            <article key={k.id} className="card cat">
              <div className="top">
                <h3>{k.name}</h3>
                <div
                  className={`left num ${left < 0 ? 'bad' : ''}`}
                  title="Remaining"
                >
                  {money(left)}
                </div>
              </div>

              <div
                className={`bar ${st}`}
                role="img"
                aria-label={`${k.name}: ${Math.round(pct)}% of budget used`}
              >
                <div className="fill" style={{ width: `${pct.toFixed(1)}%` }}></div>
                {b > 0 && (
                  <div
                    className="pace"
                    style={{ left: `${(c.frac * 100).toFixed(1)}%` }}
                  ></div>
                )}
              </div>

              <div className="meta">
                <span className="num">
                  {money(s)} of {money(b)}
                </span>
                <span className={`pill ${st}`}>
                  {left < 0 ? `Over by ${money(-left)}` : STATUS_TXT[st]}
                </span>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
};
