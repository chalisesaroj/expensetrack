import React, { useEffect } from 'react';
import { useBudget } from '../context/BudgetContext';
import { money, num } from '../utils';
import { DEFAULT_MEMBERS } from '../constants';

export const SpendForm: React.FC = () => {
  const {
    cats,
    spends,
    form,
    updateFormField,
    setForm,
    resetForm,
    saveSpend,
    setTab,
    calculations,
    cfg,
  } = useBudget();

  const members = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;

  // Ensure selected category is valid
  useEffect(() => {
    if (cats.length > 0 && !cats.some((x) => x.id === form.cat)) {
      setForm((prev) => ({ ...prev, cat: cats[0].id }));
    }
  }, [cats, form.cat, setForm]);

  if (!cats.length) {
    return (
      <section className="card flat empty">
        <p>Add a budget category first, then record spending against it.</p>
        <p style={{ marginTop: 10 }}>
          <button
            className="btn primary"
            id="goto-budget"
            type="button"
            onClick={() => setTab('budget')}
          >
            Go to Budget
          </button>
        </p>
      </section>
    );
  }

  const selectedCat = cats.find((x) => x.id === form.cat) || cats[0];
  const spentOnCat = calculations.by[selectedCat?.id || ''] || 0;
  let oldAmt = 0;
  if (form.edit) {
    const o = spends.find((e) => e.id === form.edit);
    if (o && o.cat === selectedCat?.id) {
      oldAmt = num(o.amount);
    }
  }

  const left = num(selectedCat?.budget) - (spentOnCat - oldAmt);
  const amt = num(form.amount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveSpend(
      form.cat || (cats[0] ? cats[0].id : ''),
      form.amount,
      form.date,
      form.note,
      form.member || members[0] || 'Shared'
    );
  };

  return (
    <form id="spend-form" className="card stack" onSubmit={handleSubmit}>
      <div className="row-between">
        <h2>{form.edit ? 'Edit spending' : 'Record spending'}</h2>
        {form.edit && (
          <button
            type="button"
            className="btn small"
            id="cancel-edit"
            onClick={resetForm}
          >
            Cancel edit
          </button>
        )}
      </div>

      <div className="formgrid">
        <label className="f" htmlFor="f-cat">
          Category
          <select
            id="f-cat"
            value={form.cat}
            onChange={(e) => updateFormField('cat', e.target.value)}
          >
            {cats.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </label>

        <label className="f" htmlFor="f-member">
          Spent by
          <select
            id="f-member"
            value={form.member || members[0] || 'Shared'}
            onChange={(e) => updateFormField('member', e.target.value)}
          >
            {members.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
            <option value="Shared">Shared / Family</option>
          </select>
        </label>

        <label className="f" htmlFor="f-amt">
          Amount (Rs)
          <input
            className="n"
            id="f-amt"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0"
            value={form.amount}
            onChange={(e) => updateFormField('amount', e.target.value)}
          />
        </label>

        <label className="f" htmlFor="f-date">
          Date
          <input
            id="f-date"
            type="date"
            value={form.date}
            onChange={(e) => updateFormField('date', e.target.value)}
          />
        </label>

        <label className="f wide" htmlFor="f-note">
          Note (optional)
          <input
            id="f-note"
            autoComplete="off"
            maxLength={120}
            placeholder="e.g. vegetables, fuel, flight"
            value={form.note}
            onChange={(e) => updateFormField('note', e.target.value)}
          />
        </label>

        <button className="btn primary" id="f-save" type="submit">
          {form.edit ? 'Update entry' : 'Save entry'}
        </button>
      </div>

      <p className="hint" id="f-hint" aria-live="polite">
        {selectedCat && (
          <>
            <b>{selectedCat.name}</b> has{' '}
            <b className={`num ${left < 0 ? 'bad' : ''}`}>{money(left)}</b> left
            {amt > 0 && (
              <>
                {' '}→{' '}
                <b className={`num ${left - amt < 0 ? 'bad' : ''}`}>
                  {money(left - amt)}
                </b>{' '}
                after this entry
              </>
            )}
            {form.member && (
              <span className="muted" style={{ marginLeft: 8 }}>
                (Payer: <b>{form.member}</b>)
              </span>
            )}
          </>
        )}
      </p>
    </form>
  );
};
