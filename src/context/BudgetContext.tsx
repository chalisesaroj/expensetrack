import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { BudgetConfig, Category, Calculations, SpendEntry, SpendFormState, TabType } from '../types';
import { calc, defCats, defCfg, num, today, uid } from '../utils';
import {
  getSupabase,
  fetchRemoteBudgetData,
  saveSpendToSupabase,
  deleteSpendFromSupabase,
  saveCategoryToSupabase,
  deleteCategoryFromSupabase,
  saveConfigToSupabase,
  resetUserDataInSupabase,
} from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface ExportState {
  from: string;
  to: string;
  off: Record<string, boolean>;
}

interface BudgetContextType {
  user: User | null;
  loadingAuth: boolean;
  loadingData: boolean;
  signOut: () => Promise<void>;
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
  resetToStartingBudgets: () => Promise<void>;
  getDownloadBackupBlob: () => Blob;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);

  const [tab, setTabState] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    if (['overview', 'entries', 'budget', 'income'].includes(hash)) {
      return hash;
    }
    return 'overview';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  // Data states (cloud-only, zero localStorage)
  const [cats, setCats] = useState<Category[]>([]);
  const [spends, setSpends] = useState<SpendEntry[]>([]);
  const [cfg, setCfg] = useState<BudgetConfig>(defCfg());

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

  // 1. Listen for Supabase Authentication
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) {
      setLoadingAuth(false);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user || null);
      setLoadingAuth(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      setLoadingAuth(false);
    });

    return () => {
      sub.subscription.unsubscribe();
    };
  }, []);

  // 2. Fetch data from Supabase whenever user is logged in
  useEffect(() => {
    if (!user) {
      setCats([]);
      setSpends([]);
      setCfg(defCfg());
      return;
    }

    let isMounted = true;
    setLoadingData(true);

    fetchRemoteBudgetData(user.id)
      .then((data) => {
        if (!isMounted) return;
        if (data) {
          setCats(data.cats);
          setSpends(data.spends);
          setCfg(data.cfg);
          if (data.cats.length > 0) {
            setForm((f) => ({ ...f, cat: data.cats[0].id }));
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load user budget from Supabase:', err);
        showToast('Error loading your ledger from Supabase.');
      })
      .finally(() => {
        if (isMounted) setLoadingData(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, showToast]);

  const signOut = useCallback(async () => {
    const supabase = getSupabase();
    if (supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setCats([]);
    setSpends([]);
    setCfg(defCfg());
    showToast('Signed out successfully');
  }, [showToast]);

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
    if (!user) {
      showToast('You must be signed in.');
      return false;
    }
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

    // Direct write to Supabase
    saveSpendToSupabase(user.id, spendItem);

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
  }, [user, cats, calculations.by, form.edit, spends, showToast]);

  const deleteSpend = useCallback((id: string) => {
    if (!user) return;
    setSpends((prev) => prev.filter((x) => x.id !== id));
    setArmed(null);
    deleteSpendFromSupabase(user.id, id);
    showToast('Entry deleted');
  }, [user, showToast]);

  const addCategory = useCallback((name: string, budget: number): boolean => {
    if (!user) return false;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('Give the category a name.');
      return false;
    }
    const maxOrder = cats.reduce((m, k) => Math.max(m, k.order || 0), 0);
    const newCat: Category = { id: uid('c'), name: trimmed, budget: num(budget), order: maxOrder + 1 };
    setCats((prev) => [...prev, newCat]);
    saveCategoryToSupabase(user.id, newCat);
    showToast('Category added');
    return true;
  }, [user, cats, showToast]);

  const updateCategoryName = useCallback((id: string, name: string): boolean => {
    if (!user) return false;
    const trimmed = name.trim();
    if (!trimmed) {
      showToast('A category needs a name.');
      return false;
    }
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, name: trimmed } : c)));
    const existing = cats.find((c) => c.id === id);
    if (existing) {
      saveCategoryToSupabase(user.id, { ...existing, name: trimmed });
    }
    return true;
  }, [user, cats, showToast]);

  const updateCategoryBudget = useCallback((id: string, budget: number) => {
    if (!user) return;
    setCats((prev) => prev.map((c) => (c.id === id ? { ...c, budget: num(budget) } : c)));
    const existing = cats.find((c) => c.id === id);
    if (existing) {
      saveCategoryToSupabase(user.id, { ...existing, budget: num(budget) });
    }
    showToast('Budget updated');
  }, [user, cats, showToast]);

  const deleteCategory = useCallback((id: string): boolean => {
    if (!user) return false;
    setCats((prev) => prev.filter((x) => x.id !== id));
    setArmed(null);
    deleteCategoryFromSupabase(user.id, id);
    showToast('Category deleted');
    return true;
  }, [user, showToast]);

  const updateIncome = useCallback((src: string, fld: 'salary' | 'other', val: number) => {
    if (!user) return;
    setCfg((prev) => {
      const srcObj = prev.income[src] || { salary: 0, other: 0 };
      const updated = {
        ...prev,
        income: {
          ...prev.income,
          [src]: {
            ...srcObj,
            [fld]: num(val),
          },
        },
      };
      saveConfigToSupabase(user.id, updated);
      return updated;
    });
    showToast('Income updated');
  }, [user, showToast]);

  const updatePeriod = useCallback((field: 'periodStart' | 'periodEnd', val: string): boolean => {
    if (!user) return false;
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

    setCfg((prev) => {
      const updated = { ...prev, [field]: val };
      saveConfigToSupabase(user.id, updated);
      return updated;
    });
    showToast('Budget year updated');
    return true;
  }, [user, cfg.periodStart, cfg.periodEnd, showToast]);

  const restoreData = useCallback((data: { cfg?: BudgetConfig; cats: Category[]; spends: SpendEntry[] }): boolean => {
    if (!user) return false;
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
    setForm({ cat: data.cats[0]?.id || '', amount: '', date: today(), note: '', edit: null });
    setArmed(null);

    // Save to Supabase
    saveConfigToSupabase(user.id, mergedCfg);
    data.cats.forEach((c) => saveCategoryToSupabase(user.id, c));
    data.spends.forEach((s) => saveSpendToSupabase(user.id, s));

    showToast('Backup restored and saved to Supabase');
    return true;
  }, [user, showToast]);

  const resetToStartingBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await resetUserDataInSupabase(user.id);
      setCats(fresh.cats);
      setSpends(fresh.spends);
      setForm({ cat: fresh.cats[0]?.id || '', amount: '', date: today(), note: '', edit: null });
      setArmed(null);
      showToast('Budgets reset in Supabase. Income was kept.');
    } catch {
      showToast('Failed to reset budgets in Supabase.');
    }
  }, [user, showToast]);

  const getDownloadBackupBlob = useCallback((): Blob => {
    return new Blob([JSON.stringify({ cfg, cats, spends }, null, 2)], {
      type: 'application/json',
    });
  }, [cfg, cats, spends]);

  return (
    <BudgetContext.Provider
      value={{
        user,
        loadingAuth,
        loadingData,
        signOut,
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
