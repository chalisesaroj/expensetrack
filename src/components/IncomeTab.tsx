import React, { useRef } from 'react';
import { useBudget } from '../context/BudgetContext';
import { SRC } from '../constants';
import { money, num, today } from '../utils';

interface IncomeCardProps {
  srcKey: string;
  title: string;
  salaryLabel: string;
}

const IncomeCard: React.FC<IncomeCardProps> = ({ srcKey, title, salaryLabel }) => {
  const { cfg, calculations: c, updateIncome } = useBudget();
  const d = cfg.income[srcKey] || { salary: 0, other: 0 };
  const total = c.per[srcKey]?.t || 0;

  return (
    <article className="card src">
      <h2>{title}</h2>
      <label className="f" htmlFor={`in-${srcKey}-salary`}>
        {salaryLabel} (Rs)
        <input
          className="n"
          id={`in-${srcKey}-salary`}
          inputMode="decimal"
          placeholder="0"
          value={d.salary || ''}
          onChange={(e) => updateIncome(srcKey, 'salary', num(e.target.value))}
        />
      </label>
      <label className="f" htmlFor={`in-${srcKey}-other`}>
        Other income, annual (Rs)
        <input
          className="n"
          id={`in-${srcKey}-other`}
          inputMode="decimal"
          placeholder="0"
          value={d.other || ''}
          onChange={(e) => updateIncome(srcKey, 'other', num(e.target.value))}
        />
      </label>
      <div className="sub">
        <span className="muted">Annual total</span>
        <b className="num">{money(total)}</b>
      </div>
    </article>
  );
};

export const IncomeTab: React.FC = () => {
  const {
    user,
    signOut,
    cfg,
    calculations: c,
    updatePeriod,
    getDownloadBackupBlob,
    restoreData,
    resetToStartingBudgets,
    armed,
    setArmed,
    showToast,
  } = useBudget();

  const fileInputRef = useRef<HTMLInputElement>(null);

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
        showToast('That file is not a Budget Book backup.');
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
      <section className="stack">
        <div className="row-between">
          <h2>Annual income</h2>
          <span className="num">
            <span className="muted">All sources </span>
            <b>{money(c.income)}</b>
          </span>
        </div>
        <div className="srcs">
          {SRC.map(([key, label, salaryLabel]) => (
            <IncomeCard
              key={key}
              srcKey={key}
              title={label}
              salaryLabel={salaryLabel}
            />
          ))}
        </div>
      </section>

      <section className="card stack">
        <h2>Budget year</h2>
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
