import React, { useState, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { SpendForm } from './SpendForm';
import { ReportCard } from './ReportCard';
import { fmtD, money, num } from '../utils';
import { DEFAULT_MEMBERS } from '../constants';

export const EntriesTab: React.FC = () => {
  const {
    spends,
    cats,
    cfg,
    armed,
    setArmed,
    startEditSpend,
    deleteSpend,
  } = useBudget();

  const members = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;

  const [filterCat, setFilterCat] = useState<string>('all');
  const [filterMember, setFilterMember] = useState<string>('all');

  const namesMap = useMemo(() => {
    const map: Record<string, string> = {};
    cats.forEach((k) => {
      map[k.id] = k.name;
    });
    return map;
  }, [cats]);

  const filteredList = useMemo(() => {
    return spends
      .filter((e) => {
        const matchCat = filterCat === 'all' || e.cat === filterCat;
        const matchMember =
          filterMember === 'all' ||
          (e.member || 'Shared') === filterMember;
        return matchCat && matchMember;
      })
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0));
  }, [spends, filterCat, filterMember]);

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
          <div>
            <h2>All spending entries</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Filter by category or by family member.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label className="f" htmlFor="flt-cat" style={{ minWidth: 160 }}>
              Category
              <select
                id="flt-cat"
                value={filterCat}
                onChange={(e) => {
                  setFilterCat(e.target.value);
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

            <label className="f" htmlFor="flt-member" style={{ minWidth: 160 }}>
              Spent by
              <select
                id="flt-member"
                value={filterMember}
                onChange={(e) => {
                  setFilterMember(e.target.value);
                  setArmed(null);
                }}
              >
                <option value="all">All family members</option>
                {members.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
                <option value="Shared">Shared / Family</option>
              </select>
            </label>
          </div>
        </div>

        {filteredList.length > 0 ? (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Spent by</th>
                  <th>Note</th>
                  <th className="r">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((e) => {
                  const isArmed = armed === 's:' + e.id;
                  const person = e.member || 'Shared';
                  return (
                    <tr key={e.id}>
                      <td className="num">{e.date ? fmtD(e.date) : ''}</td>
                      <td>{namesMap[e.cat] || 'Removed category'}</td>
                      <td>
                        <span
                          className="pill"
                          style={{
                            background: person === 'Shared' ? 'var(--surface-2)' : 'var(--good-bg)',
                            color: person === 'Shared' ? 'var(--muted)' : 'var(--good)',
                          }}
                        >
                          {person}
                        </span>
                      </td>
                      <td>{e.note || ''}</td>
                      <td className="r num">{money(num(e.amount))}</td>
                      <td>
                        <div className="act">
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => startEditSpend(e.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`btn small danger${isArmed ? ' armed' : ''}`}
                            onClick={() => handleDeleteClick(e.id)}
                          >
                            {isArmed ? 'Confirm' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total ({filteredList.length} entries)</td>
                  <td className="r num">{money(total)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="muted empty">No entries match the selected filter.</p>
        )}
      </section>
    </>
  );
};
