import React, { useState } from 'react';
import { useBudget } from '../context/BudgetContext';
import { money, num } from '../utils';

interface CatRowProps {
  catId: string;
  name: string;
  budget: number;
  spent: number;
  entriesCount: number;
}

const CategoryRow: React.FC<CatRowProps> = ({
  catId,
  name,
  budget,
  spent,
  entriesCount,
}) => {
  const {
    armed,
    setArmed,
    updateCategoryName,
    updateCategoryBudget,
    deleteCategory,
  } = useBudget();

  const [localName, setLocalName] = useState(name);
  const [localBudget, setLocalBudget] = useState(budget ? String(budget) : '');

  // Keep in sync if prop changes externally
  React.useEffect(() => {
    setLocalName(name);
  }, [name]);

  React.useEffect(() => {
    setLocalBudget(budget ? String(budget) : '');
  }, [budget]);

  const left = budget - spent;
  const isArmed = armed === 'c:' + catId;

  const handleNameBlur = () => {
    if (localName.trim() !== name) {
      const ok = updateCategoryName(catId, localName);
      if (!ok) setLocalName(name);
    }
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleBudgetBlur = () => {
    const parsed = num(localBudget);
    if (parsed !== budget) {
      updateCategoryBudget(catId, parsed);
    }
  };

  const handleBudgetKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.currentTarget.blur();
    }
  };

  const handleDelete = () => {
    if (!isArmed) {
      setArmed('c:' + catId);
    } else {
      deleteCategory(catId);
    }
  };

  return (
    <tr>
      <td>
        <input
          id={`cn-${catId}`}
          value={localName}
          maxLength={60}
          aria-label="Category name"
          onChange={(e) => setLocalName(e.target.value)}
          onBlur={handleNameBlur}
          onKeyDown={handleNameKeyDown}
        />
      </td>
      <td>
        <input
          className="n"
          id={`cb-${catId}`}
          inputMode="decimal"
          value={localBudget}
          placeholder="0"
          aria-label={`Annual budget for ${name}`}
          onChange={(e) => setLocalBudget(e.target.value)}
          onBlur={handleBudgetBlur}
          onKeyDown={handleBudgetKeyDown}
        />
      </td>
      <td className="r num muted">{money(budget / 12)}</td>
      <td className="r num">{money(spent)}</td>
      <td className={`r num ${left < 0 ? 'bad' : ''}`}>{money(left)}</td>
      <td>
        <div className="act">
          <button
            type="button"
            className={`btn small danger${isArmed ? ' armed' : ''}`}
            id={`cd-${catId}`}
            disabled={entriesCount > 0}
            title={entriesCount > 0 ? `Delete its ${entriesCount} entries first` : undefined}
            onClick={handleDelete}
          >
            {isArmed ? 'Confirm delete' : 'Delete'}
          </button>
        </div>
      </td>
    </tr>
  );
};

export const BudgetTab: React.FC = () => {
  const { cats, spends, calculations: c, addCategory } = useBudget();
  const [newCatName, setNewCatName] = useState('');
  const [newCatBudget, setNewCatBudget] = useState('');

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const success = addCategory(newCatName, num(newCatBudget));
    if (success) {
      setNewCatName('');
      setNewCatBudget('');
    }
  };

  return (
    <>
      <section className="card stack">
        <div className="row-between">
          <h2>Annual budget by category</h2>
          <span className="muted" style={{ fontSize: 13 }}>
            Change a name or amount, then press Enter or move away to save.
          </span>
        </div>

        {cats.length > 0 ? (
          <div className="scroll">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th className="r">Annual budget (Rs)</th>
                  <th className="r">Per month</th>
                  <th className="r">Spent</th>
                  <th className="r">Remaining</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {cats.map((k) => {
                  const b = num(k.budget);
                  const s = c.by[k.id] || 0;
                  const count = spends.filter((e) => e.cat === k.id).length;
                  return (
                    <CategoryRow
                      key={k.id}
                      catId={k.id}
                      name={k.name}
                      budget={b}
                      spent={s}
                      entriesCount={count}
                    />
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td>Total</td>
                  <td className="r num">{money(c.budget)}</td>
                  <td className="r num muted">{money(c.budget / 12)}</td>
                  <td className="r num">{money(c.spent)}</td>
                  <td className="r num">{money(c.budget - c.spent)}</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <p className="empty">No categories yet. Add one below.</p>
        )}
      </section>

      <form className="card stack" id="cat-form" onSubmit={handleAddSubmit}>
        <h2>Add a category</h2>
        <div className="formgrid">
          <label className="f wide" htmlFor="nc-name">
            Name
            <input
              id="nc-name"
              maxLength={60}
              autoComplete="off"
              placeholder="e.g. Groceries"
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
            />
          </label>
          <label className="f" htmlFor="nc-amt">
            Annual budget (Rs)
            <input
              className="n"
              id="nc-amt"
              inputMode="decimal"
              autoComplete="off"
              placeholder="0"
              value={newCatBudget}
              onChange={(e) => setNewCatBudget(e.target.value)}
            />
          </label>
          <button className="btn primary" id="nc-add" type="submit">
            Add category
          </button>
        </div>
      </form>
    </>
  );
};
