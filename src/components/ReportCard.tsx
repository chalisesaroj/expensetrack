import React, { useMemo } from 'react';
import { useBudget } from '../context/BudgetContext';
import { generateReportCsv, money, num, today } from '../utils';

export const ReportCard: React.FC = () => {
  const { exp, setExp, cfg, spends, cats, showToast } = useBudget();

  const fromDate = exp.from || cfg.periodStart;
  const toDate = exp.to || today();

  const matchingRows = useMemo(() => {
    return spends
      .filter((e) => !exp.off[e.cat] && e.date && e.date >= fromDate && e.date <= toDate)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.created || 0) - (b.created || 0));
  }, [spends, exp.off, fromDate, toDate]);

  const totalAmount = useMemo(() => {
    return matchingRows.reduce((t, e) => t + num(e.amount), 0);
  }, [matchingRows]);

  const isInvalidDateRange = toDate < fromDate;

  const handleSelectAll = () => {
    setExp((prev) => ({ ...prev, off: {} }));
  };

  const handleSelectNone = () => {
    const newOff: Record<string, boolean> = {};
    cats.forEach((k) => {
      newOff[k.id] = true;
    });
    setExp((prev) => ({ ...prev, off: newOff }));
  };

  const handleToggleCat = (id: string, checked: boolean) => {
    setExp((prev) => {
      const nextOff = { ...prev.off };
      if (checked) {
        delete nextOff[id];
      } else {
        nextOff[id] = true;
      }
      return { ...prev, off: nextOff };
    });
  };

  const handleDownload = () => {
    if (!matchingRows.length) {
      showToast('No entries match those dates and categories.');
      return;
    }
    const csv = generateReportCsv(fromDate, toDate, matchingRows, cats);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budget-report-${fromDate}-to-${toDate}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    showToast('Report downloaded');
  };

  return (
    <section className="card stack">
      <div className="row-between">
        <h2>Download report</h2>
        <span className="muted" style={{ fontSize: 13 }}>
          Actual spending between two dates, as a CSV file for Excel or Sheets.
        </span>
      </div>

      <div className="formgrid">
        <label className="f" htmlFor="x-from">
          From
          <input
            id="x-from"
            type="date"
            value={fromDate}
            onChange={(e) => setExp((prev) => ({ ...prev, from: e.target.value }))}
          />
        </label>
        <label className="f" htmlFor="x-to">
          To
          <input
            id="x-to"
            type="date"
            value={toDate}
            onChange={(e) => setExp((prev) => ({ ...prev, to: e.target.value }))}
          />
        </label>
      </div>

      <div className="row-between">
        <span className="label">Categories</span>
        <span className="btnrow">
          <button
            type="button"
            className="btn small"
            id="x-all"
            onClick={handleSelectAll}
          >
            Select all
          </button>
          <button
            type="button"
            className="btn small"
            id="x-none"
            onClick={handleSelectNone}
          >
            Select none
          </button>
        </span>
      </div>

      <div className="checks">
        {cats.map((k) => (
          <label key={k.id}>
            <input
              type="checkbox"
              id={`xc-${k.id}`}
              checked={!exp.off[k.id]}
              onChange={(e) => handleToggleCat(k.id, e.target.checked)}
            />
            <span>{k.name}</span>
          </label>
        ))}
      </div>

      <div className="row-between">
        <p className="hint" id="exp-prev" aria-live="polite">
          {isInvalidDateRange ? (
            <b className="bad">The end date is before the start date.</b>
          ) : (
            <>
              <b>{matchingRows.length}</b> entr{matchingRows.length === 1 ? 'y' : 'ies'} totalling{' '}
              <b className="num">{money(totalAmount)}</b>
            </>
          )}
        </p>
        <button
          type="button"
          className="btn primary"
          id="x-dl"
          disabled={matchingRows.length === 0 || isInvalidDateRange}
          onClick={handleDownload}
        >
          Download CSV
        </button>
      </div>
    </section>
  );
};
