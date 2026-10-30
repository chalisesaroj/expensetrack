import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { SpendForm } from './SpendForm';
import { ReportCard } from './ReportCard';
import { fmtD, money, num } from '../utils';

export const EntriesTab: React.FC = () => {
  const {
    spends,
    cats,
    armed,
    setArmed,
    startEditSpend,
    deleteSpend,
  } = useBudget();

  const [filter, setFilter] = useState<string>('all');

  const namesMap = useMemo(() => {
    const map: Record<string, string> = {};
    cats.forEach((k) => {
      map[k.id] = k.name;
    });
    return map;
  }, [cats]);

  const filteredList = useMemo(() => {
    return spends
      .filter((e) => filter === 'all' || e.cat === filter)
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0));
  }, [spends, filter]);

  const total = useMemo(() => {
    return filteredList.reduce((t, e) => t + num(e.amount), 0);
  }, [filteredList]);

  const handleDeleteClick = (id: string) => {
    const armKey = 's:' + id;
    if (armed !== armKey) {
      setArmed(armKey);
    } else {
      deleteSpend(id);
    }
  };

  return (
    <>
      <SpendForm />
      <ReportCard />

      <section className="card stack">
        <div className="row-between">
          <h2>All entries</h2>
          <label className="f" htmlFor="flt" style={{ minWidth: 200 }}>
            Show
            <select
              id="flt"
              value={filter}
              onChange={(e) => {
                setFilter(e.target.value);
                setArmed(null);
              }}
            >
              <option value="all">All categories</option>
              {cats.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filteredList.length > 0 ? (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Note</th>
                  <th className="r">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((e) => {
                  const isArmed = armed === 's:' + e.id;
                  return (
                    <tr key={e.id}>
                      <td className="num">{e.date ? fmtD(e.date) : ''}</td>
                      <td>{namesMap[e.cat] || 'Removed category'}</td>
                      <td>{e.note || ''}</td>
                      <td className="r num">{money(num(e.amount))}</td>
                      <td>
                        <div className="act">
                          <button
                            type="button"
                            className="btn small"
                            id={`ed-${e.id}`}
                            onClick={() => startEditSpend(e.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`btn small danger${isArmed ? ' armed' : ''}`}
                            id={`del-${e.id}`}
                            onClick={() => handleDeleteClick(e.id)}
                          >
                            {isArmed ? 'Confirm delete' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3}>
                    {filteredList.length} entr{filteredList.length === 1 ? 'y' : 'ies'}
                  </td>
                  <td className="r num">{money(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="empty">No entries yet. Record your first spending above.</p>
        )}
      </section>
    </>
  );
};
