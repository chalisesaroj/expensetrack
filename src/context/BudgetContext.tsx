import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import {
  BudgetConfig,
  Category,
  Calculations,
  SpendEntry,
  SpendFormState,
  IncomeEntry,
  IncomeFormState,
  TabType,
} from '../types';
import { calc, defCats, defCfg, num, today, uid } from '../utils';
import { DEFAULT_MEMBERS, DEFAULT_INCOME_SOURCES } from '../constants';
import {
  getSupabase,
  fetchRemoteBudgetData,
  checkSchemaStatus,
  saveSpendToSupabase,
  deleteSpendFromSupabase,
  saveIncomeToSupabase,
  deleteIncomeFromSupabase,
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
  needsSchemaMigration: boolean;
  isSchemaModalOpen: boolean;
  openSchemaModal: () => void;
  closeSchemaModal: () => void;
  recheckSchema: () => Promise<boolean>;
  signOut: () => Promise<void>;
  tab: TabType;
  setTab: (t: TabType) => void;
  cats: Category[];
  spends: SpendEntry[];
  incomes: IncomeEntry[];
  cfg: BudgetConfig;
  calculations: Calculations;
  form: SpendFormState;
  setForm: React.Dispatch<React.SetStateAction<SpendFormState>>;
  updateFormField: (field: keyof SpendFormState, value: string) => void;
  resetForm: () => void;
  startEditSpend: (id: string) => void;
  incomeForm: IncomeFormState;
  setIncomeForm: React.Dispatch<React.SetStateAction<IncomeFormState>>;
  updateIncomeFormField: (field: keyof IncomeFormState, value: string) => void;
  resetIncomeForm: () => void;
  startEditIncome: (id: string) => void;
  saveIncome: (source: string, member: string, amountStr: string, dateStr: string, noteStr: string) => boolean;
  deleteIncome: (id: string) => void;
  armed: string | null;
  setArmed: (val: string | null) => void;
  toastMessage: string | null;
  showToast: (msg: string) => void;
  exp: ExportState;
  setExp: React.Dispatch<React.SetStateAction<ExportState>>;
  saveSpend: (catId: string, amountStr: string, dateStr: string, noteStr: string, memberStr?: string) => boolean;
  deleteSpend: (id: string) => void;
  addCategory: (name: string, budget: number) => boolean;
  updateCategoryName: (id: string, name: string) => boolean;
  updateCategoryBudget: (id: string, budget: number) => void;
  deleteCategory: (id: string) => boolean;
  updateMembers: (newMembers: string[]) => void;
  updatePeriod: (field: 'periodStart' | 'periodEnd', val: string) => boolean;
  restoreData: (data: { cfg?: BudgetConfig; cats: Category[]; spends: SpendEntry[]; incomes?: IncomeEntry[] }) => boolean;
  resetToStartingBudgets: () => Promise<void>;
  getDownloadBackupBlob: () => Blob;
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined);

export const BudgetProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingData, setLoadingData] = useState(false);
  const [needsSchemaMigration, setNeedsSchemaMigration] = useState(false);
  const [isSchemaModalOpen, setIsSchemaModalOpen] = useState(false);

  const [tab, setTabState] = useState<TabType>(() => {
    const hash = window.location.hash.replace('#', '') as TabType;
    if (['overview', 'entries', 'budget', 'income'].includes(hash)) {
      return hash;
    }
    return 'overview';
  });

  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [armed, setArmed] = useState<string | null>(null);

  // Cloud-only data states
  const [cats, setCats] = useState<Category[]>([]);
  const [spends, setSpends] = useState<SpendEntry[]>([]);
  const [incomes, setIncomes] = useState<IncomeEntry[]>([]);
  const [cfg, setCfg] = useState<BudgetConfig>(defCfg());

  const members = useMemo(() => {
    return cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;
  }, [cfg.members]);

  const [form, setForm] = useState<SpendFormState>({
    cat: '',
    amount: '',
    date: today(),
    note: '',
    member: DEFAULT_MEMBERS[0] || 'Husband',
    edit: null,
  });

  const [incomeForm, setIncomeForm] = useState<IncomeFormState>({
    source: DEFAULT_INCOME_SOURCES[0] || 'Salary',
    member: DEFAULT_MEMBERS[0] || 'Husband',
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

  const openSchemaModal = useCallback(() => setIsSchemaModalOpen(true), []);
  const closeSchemaModal = useCallback(() => setIsSchemaModalOpen(false), []);

  const recheckSchema = useCallback(async (): Promise<boolean> => {
    const status = await checkSchemaStatus();
    if (status.hasMemberCol && status.hasIncomesTable) {
      setNeedsSchemaMigration(false);
      return true;
    }
    setNeedsSchemaMigration(true);
    return false;
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
      setIncomes([]);
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
          setIncomes(data.incomes || []);
          setCfg(data.cfg);
          if (data.schemaNotice) {
            setNeedsSchemaMigration(true);
          } else {
            // Also verify member column
            checkSchemaStatus().then((res) => {
              if (isMounted) {
                setNeedsSchemaMigration(!res.hasMemberCol || !res.hasIncomesTable);
              }
            });
          }
          if (data.cats.length > 0) {
            setForm((f) => ({
              ...f,
              cat: data.cats[0].id,
              member: (data.cfg.members && data.cfg.members[0]) || f.member,
            }));
          }
          if (data.cfg.members && data.cfg.members.length > 0) {
            setIncomeForm((inf) => ({
              ...inf,
              member: data.cfg.members[0],
            }));
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
    setIncomes([]);
    setCfg(defCfg());
    showToast('Signed out successfully');
  }, [showToast]);

  // Derived calculations (incorporating collective family incomes & expenses)
  const calculations = useMemo(() => {
    return calc(cfg, cats, spends, incomes);
  }, [cfg, cats, spends, incomes]);

  // Spend form handlers
  const updateFormField = useCallback((field: keyof SpendFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetForm = useCallback(() => {
    setForm((prev) => ({
      cat: prev.cat || (cats[0]?.id || ''),
      amount: '',
      date: today(),
      note: '',
      member: members[0] || 'Husband',
      edit: null,
    }));
  }, [cats, members]);

  const startEditSpend = useCallback(
    (id: string) => {
      const e = spends.find((x) => x.id === id);
      if (!e) return;
      setForm({
        cat: e.cat,
        amount: String(num(e.amount)),
        date: e.date || today(),
        note: e.note || '',
        member: e.member || members[0] || 'Husband',
        edit: id,
      });
      setArmed(null);
      setTimeout(() => {
        const fc = document.getElementById('spend-form');
        if (fc) fc.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    },
    [spends, members]
  );

  const saveSpend = useCallback(
    (catId: string, amountStr: string, dateStr: string, noteStr: string, memberStr?: string): boolean => {
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

      const chosenMember = memberStr || form.member || members[0] || 'Shared';

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
        member: chosenMember,
        created: Date.now(),
      };

      if (form.edit) {
        setSpends((prev) => prev.map((e) => (e.id === form.edit ? spendItem : e)));
      } else {
        setSpends((prev) => [...prev, spendItem]);
      }

      // Direct write to Supabase with error reporting & migration detection
      saveSpendToSupabase(user.id, spendItem).then((res) => {
        if (!res.success) {
          showToast('Failed to save to database: ' + (res.error || 'Unknown error'));
        } else if (res.needsMigration) {
          setNeedsSchemaMigration(true);
          showToast('Saved to cloud (fallback mode). Run the SQL script in Supabase to enable the member column.');
        }
      });

      setForm({
        cat: catId,
        amount: '',
        date: dateStr,
        note: '',
        member: chosenMember,
        edit: null,
      });

      const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
      const formattedLeft = (left < 0 ? '−' : '') + 'Rs ' + nf.format(Math.abs(Math.round(left)));
      showToast(`Saved by ${chosenMember}. ${cat.name} has ${formattedLeft} left.`);
      return true;
    },
    [user, cats, calculations.by, form.edit, form.member, spends, members, showToast]
  );

  const deleteSpend = useCallback(
    (id: string) => {
      if (!user) return;
      setSpends((prev) => prev.filter((x) => x.id !== id));
      setArmed(null);
      deleteSpendFromSupabase(user.id, id);
      showToast('Expense entry deleted');
    },
    [user, showToast]
  );

  // Income form handlers
  const updateIncomeFormField = useCallback((field: keyof IncomeFormState, value: string) => {
    setIncomeForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  const resetIncomeForm = useCallback(() => {
    setIncomeForm((prev) => ({
      source: prev.source || DEFAULT_INCOME_SOURCES[0],
      member: prev.member || members[0] || 'Husband',
      amount: '',
      date: today(),
      note: '',
      edit: null,
    }));
  }, [members]);

  const startEditIncome = useCallback(
    (id: string) => {
      const inc = incomes.find((x) => x.id === id);
      if (!inc) return;
      setIncomeForm({
        source: inc.source,
        member: inc.member || members[0] || 'Husband',
        amount: String(num(inc.amount)),
        date: inc.date || today(),
        note: inc.note || '',
        edit: id,
      });
      setArmed(null);
      setTimeout(() => {
        const f = document.getElementById('income-form');
        if (f) f.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    },
    [incomes, members]
  );

  const saveIncome = useCallback(
    (source: string, member: string, amountStr: string, dateStr: string, noteStr: string): boolean => {
      if (!user) {
        showToast('You must be signed in.');
        return false;
      }
      const amt = num(amountStr);
      if (!source.trim() || amt <= 0) {
        showToast('Select an income source and enter an amount above zero.');
        return false;
      }
      if (!dateStr) {
        showToast('Pick an income date.');
        return false;
      }
      const chosenMember = member || members[0] || 'Husband';

      const incomeItem: IncomeEntry = {
        id: incomeForm.edit || uid('inc'),
        source: source.trim(),
        member: chosenMember,
        amount: amt,
        date: dateStr,
        note: noteStr.trim(),
        created: Date.now(),
      };

      if (incomeForm.edit) {
        setIncomes((prev) => prev.map((item) => (item.id === incomeForm.edit ? incomeItem : item)));
      } else {
        setIncomes((prev) => [...prev, incomeItem]);
      }

      saveIncomeToSupabase(user.id, incomeItem).then((res) => {
        if (!res.success) {
          showToast('Failed to save income to database: ' + (res.error || 'Unknown error'));
        } else if (res.needsMigration) {
          setNeedsSchemaMigration(true);
          showToast('Saved to cloud backup. Run the SQL script in Supabase to create the budget_incomes table.');
        }
      });

      setIncomeForm({
        source,
        member: chosenMember,
        amount: '',
        date: dateStr,
        note: '',
        edit: null,
      });

      const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
      showToast(`Income of Rs ${nf.format(amt)} recorded for ${chosenMember} (${source}).`);
      return true;
    },
    [user, incomeForm.edit, members, showToast]
  );

  const deleteIncome = useCallback(
    (id: string) => {
      if (!user) return;
      setIncomes((prev) => prev.filter((x) => x.id !== id));
      setArmed(null);
      deleteIncomeFromSupabase(user.id, id);
      showToast('Income entry deleted');
    },
    [user, showToast]
  );

  // Category management
  const addCategory = useCallback(
    (name: string, budget: number): boolean => {
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
    },
    [user, cats, showToast]
  );

  const updateCategoryName = useCallback(
    (id: string, name: string): boolean => {
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
    },
    [user, cats, showToast]
  );

  const updateCategoryBudget = useCallback(
    (id: string, budget: number) => {
      if (!user) return;
      setCats((prev) => prev.map((c) => (c.id === id ? { ...c, budget: num(budget) } : c)));
      const existing = cats.find((c) => c.id === id);
      if (existing) {
        saveCategoryToSupabase(user.id, { ...existing, budget: num(budget) });
      }
      showToast('Budget updated');
    },
    [user, cats, showToast]
  );

  const deleteCategory = useCallback(
    (id: string): boolean => {
      if (!user) return false;
      setCats((prev) => prev.filter((x) => x.id !== id));
      setArmed(null);
      deleteCategoryFromSupabase(user.id, id);
      showToast('Category deleted');
      return true;
    },
    [user, showToast]
  );

  // Family Members Management
  const updateMembers = useCallback(
    (newMembers: string[]) => {
      if (!user) return;
      const clean = newMembers.map((m) => m.trim()).filter(Boolean);
      if (clean.length === 0) {
        showToast('You must have at least one family member.');
        return;
      }

      // Check if any member was renamed so we can migrate existing entries smoothly
      const oldMembers = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;
      const renameMap: Record<string, string> = {};
      oldMembers.forEach((oldName, idx) => {
        if (clean[idx] && clean[idx] !== oldName) {
          renameMap[oldName] = clean[idx];
        }
      });

      setCfg((prev) => {
        const updated = { ...prev, members: clean };
        saveConfigToSupabase(user.id, updated);
        return updated;
      });

      // If any member was renamed, update existing spends and incomes that used the old name
      if (Object.keys(renameMap).length > 0) {
        setSpends((prev) =>
          prev.map((s) => {
            if (s.member && renameMap[s.member]) {
              const updatedSpend = { ...s, member: renameMap[s.member] };
              saveSpendToSupabase(user.id, updatedSpend);
              return updatedSpend;
            }
            return s;
          })
        );

        setIncomes((prev) =>
          prev.map((inc) => {
            if (inc.member && renameMap[inc.member]) {
              const updatedIncome = { ...inc, member: renameMap[inc.member] };
              saveIncomeToSupabase(user.id, updatedIncome);
              return updatedIncome;
            }
            return inc;
          })
        );
      }

      setForm((f) => ({
        ...f,
        member: clean[0] || f.member,
      }));

      setIncomeForm((inf) => ({
        ...inf,
        member: clean[0] || inf.member,
      }));

      showToast('Family member names saved to database!');
    },
    [user, cfg.members, showToast]
  );

  const updatePeriod = useCallback(
    (field: 'periodStart' | 'periodEnd', val: string): boolean => {
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
    },
    [user, cfg.periodStart, cfg.periodEnd, showToast]
  );

  const restoreData = useCallback(
    (data: { cfg?: BudgetConfig; cats: Category[]; spends: SpendEntry[]; incomes?: IncomeEntry[] }): boolean => {
      if (!user) return false;
      if (!data || !Array.isArray(data.cats) || !Array.isArray(data.spends)) {
        showToast('That file is not a Budget Book backup.');
        return false;
      }
      const d = defCfg();
      const mergedCfg: BudgetConfig = {
        periodStart: data.cfg?.periodStart || d.periodStart,
        periodEnd: data.cfg?.periodEnd || d.periodEnd,
        members:
          Array.isArray(data.cfg?.members) && data.cfg.members.length > 0
            ? data.cfg.members
            : d.members,
        income: { ...d.income, ...(data.cfg?.income || {}) },
      };

      const restoredIncomes = Array.isArray(data.incomes) ? data.incomes : [];

      setCats(data.cats);
      setSpends(data.spends);
      setIncomes(restoredIncomes);
      setCfg(mergedCfg);
      setForm({
        cat: data.cats[0]?.id || '',
        amount: '',
        date: today(),
        note: '',
        member: mergedCfg.members[0] || 'Husband',
        edit: null,
      });
      setIncomeForm({
        source: DEFAULT_INCOME_SOURCES[0],
        member: mergedCfg.members[0] || 'Husband',
        amount: '',
        date: today(),
        note: '',
        edit: null,
      });
      setArmed(null);

      // Save to Supabase
      saveConfigToSupabase(user.id, mergedCfg);
      data.cats.forEach((c) => saveCategoryToSupabase(user.id, c));
      data.spends.forEach((s) => saveSpendToSupabase(user.id, s));
      restoredIncomes.forEach((inc) => saveIncomeToSupabase(user.id, inc));

      showToast('Backup restored and saved to Supabase');
      return true;
    },
    [user, showToast]
  );

  const resetToStartingBudgets = useCallback(async () => {
    if (!user) return;
    try {
      const fresh = await resetUserDataInSupabase(user.id);
      setCats(fresh.cats);
      setSpends(fresh.spends);
      setIncomes(fresh.incomes);
      setForm({
        cat: fresh.cats[0]?.id || '',
        amount: '',
        date: today(),
        note: '',
        member: fresh.cfg.members[0] || 'Husband',
        edit: null,
      });
      setIncomeForm({
        source: DEFAULT_INCOME_SOURCES[0],
        member: fresh.cfg.members[0] || 'Husband',
        amount: '',
        date: today(),
        note: '',
        edit: null,
      });
      setArmed(null);
      showToast('Budgets and records reset in Supabase.');
    } catch {
      showToast('Failed to reset data in Supabase.');
    }
  }, [user, showToast]);

  const getDownloadBackupBlob = useCallback((): Blob => {
    return new Blob([JSON.stringify({ cfg, cats, spends, incomes }, null, 2)], {
      type: 'application/json',
    });
  }, [cfg, cats, spends, incomes]);

  return (
    <BudgetContext.Provider
      value={{
        user,
        loadingAuth,
        loadingData,
        needsSchemaMigration,
        isSchemaModalOpen,
        openSchemaModal,
        closeSchemaModal,
        recheckSchema,
        signOut,
        tab,
        setTab,
        cats,
        spends,
        incomes,
        cfg,
        calculations,
        form,
        setForm,
        updateFormField,
        resetForm,
        startEditSpend,
        incomeForm,
        setIncomeForm,
        updateIncomeFormField,
        resetIncomeForm,
        startEditIncome,
        saveIncome,
        deleteIncome,
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
        updateMembers,
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
