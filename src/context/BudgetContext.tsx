import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { KEY, ADDED_V2 } from '../constants';
import { BudgetConfig, Category, Calculations, SpendEntry, SpendFormState, TabType } from '../types';
import { calc, defCats, defCfg, num, today, uid } from '../utils';
import {
  getSupabase,
  upsertSingleSpend,
  deleteSpendFromSupabase,
  upsertSingleCategory,
  deleteCategoryFromSupabase,
} from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface ExportState {
  from: string;
  to: string;
  off: Record<string, boolean>;
}

interface BudgetContextType {
  tab: TabType;
  setTab: (t: TabType) => void;
  cats: Category[];
  spends: SpendEntry[];
  cfg: BudgetConfig;
  calculations: Calculations;
  form: SpendFormState;
  setForm: React.Dispatch<React.SetStateAction<SpendFormState>>;
  updateFormField: (field: keyof SpendFormState, value: string) => void;
  resetForm: () => void;
  startEditSpend: (id: string) => void;
  armed: string | null;
  setArmed: (val: string | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  exp: ExportState;
  setExp: React.Dispatch<React.SetStateAction<ExportState>>;
  saveSpend: (catId: string, amountStr: string, dateStr: string, noteStr: string) => boolean;
  deleteSpend: (id: string) => void;
  addCategory: (name: string, budget: number) => boolean;
  updateCategoryName: (id: string, name: string) => boolean;
  updateCategoryBudget: (id: string, budget: number) => void;
  deleteCategory: (id: string) => boolean;
  updateIncome: (src: string, fld: 'salary' | 'other', val: number) => void;
  updatePeriod: (field: 'periodStart' | 'periodEnd', val: string) => boolean;
  restoreData: (data: { cfg?: BudgetConfig; cats: Category[]; spends: SpendEntry[] }) => boolean;
  resetToStartingBudgets: () => void;
  getDownloadBackupBlob: () => Blob;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tab, setTabState] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    if (['overview', 'entries', 'budget', 'income'].includes(hash)) {
      return hash;
    }
    return 'overview';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Track authenticated Supabase user for real-time live sync
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    supabase.auth.getUser().then(({ data }) => {
      setCurrentUser(data.user || null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setCurrentUser(session?.user || null);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  const [cats, setCats] = useState<Category[]>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const j = JSON.parse(saved);
        if (j && Array.isArray(j.cats)) {
          const loadedCats: Category[] = j.cats;
          if (!j.v || j.v < 2) {
            ADDED_V2.forEach((n) => {
              if (!loadedCats.some((c) => String(c.name).toLowerCase() === n.toLowerCase())) {
                const maxOrder = loadedCats.reduce((m, k) => Math.max(m, k.order || 0), 0);
                loadedCats.push({ id: uid('c'), name: n, budget: 0, order: maxOrder + 1 });
              }
            });
          }
          return loadedCats;
        }
      }
    } catch {
      // ignore
    }
    return defCats();
  });

  const [spends, setSpends] = useState<SpendEntry[]>(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const j = JSON.parse(saved);
        if (j && Array.isArray(j.spends)) {
          return j.spends;
        }
      }
    } catch {
      // ignore
    }
    return [];
  });

  const [cfg, setCfg] = useState<BudgetConfig>(() => {
    const d = defCfg();
    try {
      const saved = localStorage.getItem(KEY);
      if (saved) {
        const j = JSON.parse(saved);
        if (j && j.cfg) {
          const merged = { ...d, ...j.cfg };
          merged.income = { ...d.income, ...(j.cfg.income || {}) };
          return merged;
        }
      }
    } catch {
      // ignore
    }
    return d;
  });

  const [form, setForm] = useState<SpendFormState>({
    cat: '',
    amount: '',
    date: today(),
    note: '',
    edit: null,
  });

  const [exp, setExp] = useState<ExportState>({
    from: '',
    to: '',
    off: {},
  });

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
  }, []);

  const setTab = useCallback((t: TabType) => {
    setTabState(t);
    setArmed(null);
    try {
      window.history.replaceState(null, '', '#' + t);
    } catch {
      // ignore
    }
  }, []);

  // Sync state to local storage
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 2, cfg, cats, spends }));
    } catch {
      showToast('This browser blocked saving. Use Download backup on the Income tab.');
    }
  }, [cfg, cats, spends, showToast]);

  // Derived calculations
  const calculations = useMemo(() => {
    return calc(cfg, cats, spends);
  }, [cfg, cats, spends]);

  const updateFormField = useCallback((field: keyof SpendFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm((prev) => ({
      cat: prev.cat,
      amount: '',
      date: today(),
      note: '',
      edit: null,
    }));
  }, []);

  const startEditSpend = useCallback((id: string) => {
    const e = spends.find((x) => x.id === id);
    if (!e) return;
    setForm({
      cat: e.cat,
      amount: String(num(e.amount)),
      date: e.date || today(),
      note: e.note || '',
      edit: id,
    });
    setArmed(null);
    setTimeout(() => {
      const fc = document.getElementById('spend-form');
      if (fc) fc.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 50);
  }, [spends]);

  const saveSpend = useCallback((catId: string, amountStr: string, dateStr: string, noteStr: string): boolean => {
    const amt = num(amountStr);
    if (!catId || amt <= 0) {
      showToast('Choose a category and enter an amount above zero.');
      return false;
    }
    if (!dateStr) {
      showToast('Pick a date.');
      return false;
    }
    const cat = cats.find((x) => x.id === catId);
    if (!cat) return false;

    let prior = calculations.by[catId] || 0;
    if (form.edit) {
      const o = spends.find((e) => e.id === form.edit);
      if (o && o.cat === catId) prior -= num(o.amount);
    }
    const left = num(cat.budget) - prior - amt;

    const spendItem: SpendEntry = {
      id: form.edit || uid('s'),
      cat: catId,
      amount: amt,
      date: dateStr,
      note: noteStr.trim(),
      created: Date.now(),
    };

    if (form.edit) {
      setSpends((prev) =>
        prev.map((e) => (e.id === form.edit ? spendItem : e))
      );
    } else {
      setSpends((prev) => [...prev, spendItem]);
    }

    // Auto-sync in real-time if signed into Supabase
    if (currentUser) {
      upsertSingleSpend(currentUser.id, spendItem);
    }

    setForm({
      cat: catId,
      amount: '',
      date: dateStr,
      note: '',
      edit: null,
    });

    const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });
    const formattedLeft = (left < 0 ? '−' : '') + 'Rs ' + nf.format(Math.abs(left));
    showToast(`Saved. ${cat.name} has ${formattedLeft} left${left < 0 ? ' (over budget).' : '.'}`);
    return true;
  }, [cats, calculations.by, form.edit, spends, currentUser, showToast]);

  const deleteSpend = useCallback((id: string) => {
    setSpends((prev) => prev.filter((x) => x.id !== id));
    setArmed(null);
    if (currentUser) {
      deleteSpendFromSupabase(currentUser.id, id);
    }
    showToast('Entry deleted');
  }, [currentUser, showToast]);

  const addCategory = useCallback((name: string, budget: number): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Give the category a name.');
      return false;
    }
    const maxOrder = cats.reduce((m, k) => Math.max(m, k.order || 0), 0);
    const newCat: Category = { id: uid('c'), name: trimmed, budget: num(budget), order: maxOrder + 1 };
    setCats((prev) => [...prev, newCat]);
    if (currentUser) {
      upsertSingleCategory(currentUser.id, newCat);
    }
    showToast('Category added');
    return true;
  }, [cats, currentUser, showToast]);

  const updateCategoryName = useCallback((id: string, name: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('A category needs a name.');
      return false;
    }
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
    if (currentUser) {
      const existing = cats.find((c) => c.id === id);
      if (existing) {
        upsertSingleCategory(currentUser.id, { ...existing, name: trimmed });
      }
    }
    return true;
  }, [cats, currentUser, showToast]);

  const updateCategoryBudget = useCallback((id: string, budget: number) => {
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, budget: num(budget) } : c)));
    if (currentUser) {
      const existing = cats.find((c) => c.id === id);
      if (existing) {
        upsertSingleCategory(currentUser.id, { ...existing, budget: num(budget) });
      }
    }
    showToast('Budget updated');
  }, [cats, currentUser, showToast]);

  const deleteCategory = useCallback((id: string): boolean => {
    setCats((prev) => prev.filter((x) => x.id !== id));
    setArmed(null);
    if (currentUser) {
      deleteCategoryFromSupabase(currentUser.id, id);
    }
    showToast('Category deleted');
    return true;
  }, [currentUser, showToast]);

  const updateIncome = useCallback((src: string, fld: 'salary' | 'other', val: number) => {
    setCfg((prev) => {
      const srcObj = prev.income[src] || { salary: 0, other: 0 };
      return {
        ...prev,
        income: {
          ...prev.income,
          [src]: {
            ...srcObj,
            [fld]: num(val),
          },
        },
      };
    });
    showToast('Income updated');
  }, [showToast]);

  const updatePeriod = useCallback((field: 'periodStart' | 'periodEnd', val: string): boolean => {
    const s = field === 'periodStart' ? val : cfg.periodStart;
    const e = field === 'periodEnd' ? val : cfg.periodEnd;
    const parse = (str: string) => {
      const p = str.split('-');
      return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
    };

    if (!val || parse(e) < parse(s)) {
      showToast('Choose an end date after the start date.');
      return false;
    }

    setCfg((prev) => ({ ...prev, [field]: val }));
    showToast('Budget year updated');
    return true;
  }, [cfg.periodStart, cfg.periodEnd, showToast]);

  const restoreData = useCallback((data: { cfg?: BudgetConfig; cats: Category[]; spends: SpendEntry[] }): boolean => {
    if (!data || !Array.isArray(data.cats) || !Array.isArray(data.spends)) {
      showToast('That file is not a Budget Book backup.');
      return false;
    }
    const d = defCfg();
    const mergedCfg = { ...d, ...(data.cfg || {}) };
    mergedCfg.income = { ...d.income, ...(data.cfg?.income || {}) };

    setCats(data.cats);
    setSpends(data.spends);
    setCfg(mergedCfg);
    setForm({ cat: '', amount: '', date: today(), note: '', edit: null });
    setArmed(null);
    showToast('Backup restored');
    return true;
  }, [showToast]);

  const resetToStartingBudgets = useCallback(() => {
    setCats(defCats());
    setSpends([]);
    setForm({ cat: '', amount: '', date: today(), note: '', edit: null });
    setArmed(null);
    showToast('Budgets reset. Income was kept.');
  }, [showToast]);

  const getDownloadBackupBlob = useCallback((): Blob => {
    return new Blob([JSON.stringify({ cfg, cats, spends }, null, 2)], {
      type: 'application/json',
    });
  }, [cfg, cats, spends]);

  return (
    <BudgetContext.Provider
      value={{
        tab,
        setTab,
        cats,
        spends,
        cfg,
        calculations,
        form,
        setForm,
        updateFormField,
        resetForm,
        startEditSpend,
        armed,
        setArmed,
        toastMessage,
        showToast,
        exp,
        setExp,
        saveSpend,
        deleteSpend,
        addCategory,
        updateCategoryName,
        updateCategoryBudget,
        deleteCategory,
        updateIncome,
        updatePeriod,
        restoreData,
        resetToStartingBudgets,
        getDownloadBackupBlob,
      }}
    >
      {children}
    </BudgetContext.Provider>
  );
};

export function useBudget() {
  const context = useContext(BudgetContext);
  if (!context) {
    throw new Error('useBudget must be used within a BudgetProvider');
  }
  return context;
}
