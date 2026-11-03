import React, { useState, useRef, useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { DEFAULT_INCOME_SOURCES, DEFAULT_MEMBERS } from '../constants';
import { fmtD, money, num, today } from '../utils';

export const IncomeTab: React.FC = () => {
  const {
    user,
    signOut,
    cfg,
    incomes,
    calculations: c,
    incomeForm,
    updateIncomeFormField,
    resetIncomeForm,
    startEditIncome,
    saveIncome,
    deleteIncome,
    updateMembers,
    updatePeriod,
    getDownloadBackupBlob,
    restoreData,
    resetToStartingBudgets,
    armed,
    setArmed,
    showToast,
    openSchemaModal,
  } = useBudget();

  const members = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;

  // Family member editor state
  const [editingMembers, setEditingMembers] = useState(false);
  const [memberInputs, setMemberInputs] = useState<string[]>(members);
  const [newMemberName, setNewMemberName] = useState('');

  // Sync member inputs whenever user data loads from database
  React.useEffect(() => {
    setMemberInputs(members);
  }, [members]);

  // Income table filters
  const [filterMember, setFilterMember] = useState<string>('all');
  const [filterSource, setFilterSource] = useState<string>('all');

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleMemberSave = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = memberInputs.map((m) => m.trim()).filter(Boolean);
    if (newMemberName.trim()) {
      clean.push(newMemberName.trim());
      setNewMemberName('');
    }
    if (clean.length === 0) {
      showToast('At least one family member is required.');
      return;
    }
    updateMembers(clean);
    setMemberInputs(clean);
    setEditingMembers(false);
  };

  const handleAddMemberClick = () => {
    if (!newMemberName.trim()) return;
    const clean = [...memberInputs, newMemberName.trim()];
    updateMembers(clean);
    setMemberInputs(clean);
    setNewMemberName('');
  };

  const handleIncomeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveIncome(
      incomeForm.source || DEFAULT_INCOME_SOURCES[0],
      incomeForm.member || members[0] || 'Husband',
      incomeForm.amount,
      incomeForm.date,
      incomeForm.note
    );
  };

  // Filtered income list
  const filteredIncomes = useMemo(() => {
    return incomes
      .filter((inc) => {
        const matchMem = filterMember === 'all' || (inc.member || members[0]) === filterMember;
        const matchSrc = filterSource === 'all' || inc.source === filterSource;
        return matchMem && matchSrc;
      })
      .slice()
      .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.created || 0) - (a.created || 0));
  }, [incomes, filterMember, filterSource, members]);

  const totalFilteredIncome = useMemo(() => {
    return filteredIncomes.reduce((t, e) => t + num(e.amount), 0);
  }, [filteredIncomes]);

  const handleDeleteIncomeClick = (id: string) => {
    const armKey = 'inc:' + id;
    if (armed !== armKey) {
      setArmed(armKey);
    } else {
      deleteIncome(id);
    }
  };

  const handleBackup = () => {
    const blob = getDownloadBackupBlob();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budget-book-backup-${today()}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Backup downloaded');
  };

  const handleRestoreClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string);
        restoreData(parsed);
      } catch {
        showToast('That file is not a valid Budget Book backup.');
      }
    };
    reader.readAsText(file);
  };

  const resetArmed = armed === 'reset';

  const handleResetClick = () => {
    if (!resetArmed) {
      setArmed('reset');
    } else {
      resetToStartingBudgets();
    }
  };

  return (
    <>
      {/* 1. Family Members Setup */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <h2>Family Members & Earners</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Default names are <b>Husband</b> and <b>Wife</b>. Click &quot;Edit names&quot; to customize them for your family. Your custom names are saved to your cloud account and will load automatically on every login.
            </p>
          </div>
          <button
            type="button"
            className="btn small"
            onClick={() => {
              setEditingMembers((prev) => !prev);
              setMemberInputs(members);
            }}
          >
            {editingMembers ? 'Done' : 'Edit names'}
          </button>
        </div>

        {editingMembers ? (
          <form onSubmit={handleMemberSave} className="stack" style={{ gap: 12 }}>
            <div className="formgrid">
              {memberInputs.map((name, idx) => (
                <label key={idx} className="f">
                  Person {idx + 1} Name
                  <input
                    value={name}
                    placeholder={`Person ${idx + 1}`}
                    onChange={(e) => {
                      const updated = [...memberInputs];
                      updated[idx] = e.target.value;
                      setMemberInputs(updated);
                    }}
                  />
                </label>
              ))}
              <label className="f">
                + Add another person
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={newMemberName}
                    placeholder="e.g. Son, Daughter"
                    onChange={(e) => setNewMemberName(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn small"
                    onClick={handleAddMemberClick}
                  >
                    Add
                  </button>
                </div>
              </label>
            </div>
            <div className="btnrow">
              <button type="submit" className="btn primary">
                Save Member Names
              </button>
            </div>
          </form>
        ) : (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {members.map((name, idx) => (
              <div
                key={name}
                style={{
                  background: 'var(--surface-2)',
                  padding: '8px 14px',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  border: '1px solid var(--line)',
                }}
              >
                <span className="label" style={{ margin: 0 }}>Person {idx + 1}:</span>
                <b style={{ fontSize: 15 }}>{name}</b>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Record Income Form */}
      <form id="income-form" className="card stack" onSubmit={handleIncomeSubmit}>
        <div className="row-between">
          <h2>{incomeForm.edit ? 'Edit Income Entry' : 'Record Income'}</h2>
          {incomeForm.edit && (
            <button
              type="button"
              className="btn small"
              onClick={resetIncomeForm}
            >
              Cancel edit
            </button>
          )}
        </div>

        <div className="formgrid">
          <label className="f" htmlFor="inc-source">
            Income Source
            <select
              id="inc-source"
              value={incomeForm.source}
              onChange={(e) => updateIncomeFormField('source', e.target.value)}
            >
              {DEFAULT_INCOME_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
                </option>
              ))}
            </select>
          </label>

          <label className="f" htmlFor="inc-member">
            Received by (Person)
            <select
              id="inc-member"
              value={incomeForm.member || members[0] || 'Husband'}
              onChange={(e) => updateIncomeFormField('member', e.target.value)}
            >
              {members.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>

          <label className="f" htmlFor="inc-amt">
            Amount (Rs)
            <input
              className="n"
              id="inc-amt"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={incomeForm.amount}
              onChange={(e) => updateIncomeFormField('amount', e.target.value)}
            />
          </label>

          <label className="f" htmlFor="inc-date">
            Date
            <input
              id="inc-date"
              type="date"
              value={incomeForm.date}
              onChange={(e) => updateIncomeFormField('date', e.target.value)}
            />
          </label>

          <label className="f wide" htmlFor="inc-note">
            Note (optional)
            <input
              id="inc-note"
              autoComplete="off"
              maxLength={120}
              placeholder="e.g. October salary, client project, DA allowance"
              value={incomeForm.note}
              onChange={(e) => updateIncomeFormField('note', e.target.value)}
            />
          </label>

          <button className="btn primary" id="inc-save" type="submit">
            {incomeForm.edit ? 'Update income' : 'Save income'}
          </button>
        </div>
      </form>

      {/* 3. Collective Family Income Summary */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <h2>Collective Family Income</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              Total income earned collectively by all family members.
            </p>
          </div>
          <div className="headfig">
            <span className="label">Total Family Income</span>
            <b className="num good" style={{ fontSize: 24 }}>
              {money(c.income)}
            </b>
          </div>
        </div>

        {/* Member Breakdown */}
        <div className="srcs" style={{ marginTop: 8 }}>
          {members.map((m) => {
            const incAmt = c.incomeByMember[m] || 0;
            const pct = c.income > 0 ? (incAmt / c.income) * 100 : 0;
            return (
              <article key={m} className="card src" style={{ background: 'var(--surface-2)' }}>
                <div className="row-between">
                  <h3>{m}</h3>
                  <span className="pill ok">{pct.toFixed(0)}% of total</span>
                </div>
                <div style={{ marginTop: 4 }}>
                  <span className="label">Total Earned</span>
                  <div className="num good" style={{ fontSize: 22, fontWeight: 700 }}>
                    {money(incAmt)}
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* Sources Breakdown */}
        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 14, marginTop: 6 }}>
          <span className="label" style={{ display: 'block', marginBottom: 8 }}>
            Income by Source:
          </span>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {DEFAULT_INCOME_SOURCES.map((src) => {
              const srcAmt = c.incomeBySource[src] || 0;
              return (
                <div
                  key={src}
                  style={{
                    background: 'var(--surface-2)',
                    padding: '6px 12px',
                    borderRadius: 6,
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span className="muted">{src}:</span>
                  <b className="num">{money(srcAmt)}</b>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 4. Income Entries History Table */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <h2>Income Entries</h2>
            <span className="muted" style={{ fontSize: 13 }}>
              Log of all income transactions received.
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <label className="f" htmlFor="flt-inc-member" style={{ minWidth: 150 }}>
              Person
              <select
                id="flt-inc-member"
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
              </select>
            </label>

            <label className="f" htmlFor="flt-inc-source" style={{ minWidth: 150 }}>
              Source
              <select
                id="flt-inc-source"
                value={filterSource}
                onChange={(e) => {
                  setFilterSource(e.target.value);
                  setArmed(null);
                }}
              >
                <option value="all">All sources</option>
                {DEFAULT_INCOME_SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        {filteredIncomes.length > 0 ? (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Received by</th>
                  <th>Source</th>
                  <th>Note</th>
                  <th className="r">Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredIncomes.map((inc) => {
                  const isArmed = armed === 'inc:' + inc.id;
                  return (
                    <tr key={inc.id}>
                      <td className="num">{inc.date ? fmtD(inc.date) : ''}</td>
                      <td>
                        <span className="pill ok">{inc.member || members[0]}</span>
                      </td>
                      <td>
                        <b>{inc.source}</b>
                      </td>
                      <td>{inc.note || ''}</td>
                      <td className="r num good" style={{ fontWeight: 600 }}>
                        {money(num(inc.amount))}
                      </td>
                      <td>
                        <div className="act">
                          <button
                            type="button"
                            className="btn small"
                            onClick={() => startEditIncome(inc.id)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className={`btn small danger${isArmed ? ' armed' : ''}`}
                            onClick={() => handleDeleteIncomeClick(inc.id)}
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
                  <td colSpan={4}>Total ({filteredIncomes.length} entries)</td>
                  <td className="r num good" style={{ fontWeight: 700 }}>
                    {money(totalFilteredIncome)}
                  </td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="muted empty">No income recorded yet. Use the form above to add an entry.</p>
        )}
      </section>

      {/* 5. Budget Year Dates */}
      <section className="card stack">
        <h2>Budget Year</h2>
        <p className="muted" style={{ fontSize: 13 }}>
          Sets the even-pace marker on each category. Change it if your year runs from a different month.
        </p>
        <div className="formgrid">
          <label className="f" htmlFor="p-start">
            Starts
            <input
              id="p-start"
              type="date"
              value={cfg.periodStart}
              onChange={(e) => updatePeriod('periodStart', e.target.value)}
            />
          </label>
          <label className="f" htmlFor="p-end">
            Ends
            <input
              id="p-end"
              type="date"
              value={cfg.periodEnd}
              onChange={(e) => updatePeriod('periodEnd', e.target.value)}
            />
          </label>
        </div>
      </section>

      {/* 6. Cloud Account & Backup */}
      <section className="card stack">
        <div className="row-between">
          <div>
            <h2>Cloud Account & Data</h2>
            <p className="muted" style={{ fontSize: 13 }}>
              All records are stored directly in your private Supabase cloud database.
            </p>
          </div>
          {user && (
            <div style={{ textAlign: 'right' }}>
              <span className="label" style={{ display: 'block' }}>Signed in as</span>
              <b style={{ fontSize: 14 }}>{user.email}</b>
            </div>
          )}
        </div>

        <div className="btnrow" style={{ marginTop: 8 }}>
          <button
            type="button"
            className="btn"
            id="backup"
            onClick={handleBackup}
          >
            Download JSON backup
          </button>
          <button
            type="button"
            className="btn"
            id="restore-btn"
            onClick={handleRestoreClick}
          >
            Restore from JSON
          </button>
          <button
            type="button"
            className="btn"
            onClick={openSchemaModal}
          >
            ⚙️ Database SQL Setup
          </button>
          <button
            type="button"
            className={`btn danger${resetArmed ? ' armed' : ''}`}
            id="reset"
            onClick={handleResetClick}
          >
            {resetArmed
              ? 'Confirm: erase all entries and reset budgets in cloud'
              : 'Reset to starting budgets'}
          </button>
          {user && (
            <button
              type="button"
              className="btn"
              onClick={signOut}
            >
              Sign out
            </button>
          )}
        </div>
        <input
          type="file"
          id="restore-file"
          ref={fileInputRef}
          accept="application/json,.json"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </section>
    </>
  );
};
