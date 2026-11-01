import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BudgetConfig, Category, SpendEntry, IncomeEntry } from '../types';
import { defCats, defCfg } from '../utils';
import { DEFAULT_MEMBERS } from '../constants';

let cachedClient: SupabaseClient | null = null;
let currentUrl = '';
let currentKey = '';

export const DEFAULT_SUPABASE_URL = 'https://pzahjejjyamgstoofxac.supabase.co';
export const DEFAULT_SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB6YWhqZWpqeWFtZ3N0b29meGFjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMzMTY0OTEsImV4cCI6MjEwODg5MjQ5MX0.GwtNYOAMNf9_e9pqQjm38KeI8dOfQhHRUUVWRf34Ip8';

export function cleanSupabaseUrl(raw: string): string {
  let u = raw.trim();
  if (!u) return '';
  if (!/^https?:\/\//i.test(u)) {
    u = 'https://' + u;
  }
  try {
    const parsed = new URL(u);
    return parsed.origin;
  } catch {
    return u.replace(/\/+$/, '').replace(/\/auth\/v1.*$/i, '').replace(/\/rest\/v1.*$/i, '');
  }
}

export function cleanSupabaseKey(raw: string): string {
  return raw.trim();
}

export function getSupabaseCredentials(): { url: string; key: string } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const url = cleanSupabaseUrl(envUrl || DEFAULT_SUPABASE_URL);
  const key = cleanSupabaseKey(envKey || DEFAULT_SUPABASE_ANON_KEY);

  return { url, key };
}

export function getSupabase(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();
  if (!url || !key) return null;

  if (cachedClient && currentUrl === url && currentKey === key) {
    return cachedClient;
  }

  try {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
    currentUrl = url;
    currentKey = key;
    return cachedClient;
  } catch (err) {
    console.error('Failed to initialize Supabase client:', err);
    return null;
  }
}

// ----------------- Supabase Data Operations -----------------

export async function fetchRemoteBudgetData(userId: string): Promise<{
  cats: Category[];
  spends: SpendEntry[];
  incomes: IncomeEntry[];
  cfg: BudgetConfig;
} | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const [catsRes, spendsRes, cfgRes, incomesRes] = await Promise.all([
      supabase.from('budget_categories').select('*').order('order_num', { ascending: true }),
      supabase.from('budget_spends').select('*').order('date', { ascending: true }),
      supabase.from('budget_config').select('*').maybeSingle(),
      supabase.from('budget_incomes').select('*').order('date', { ascending: true }),
    ]);

    if (catsRes.error) throw catsRes.error;
    if (spendsRes.error) throw spendsRes.error;

    // If user has no categories yet, initialize with defaults directly in Supabase
    if (!catsRes.data || catsRes.data.length === 0) {
      return await seedInitialUserData(userId);
    }

    const cats: Category[] = (catsRes.data || []).map((row) => ({
      id: String(row.id),
      name: String(row.name),
      budget: Number(row.budget) || 0,
      order: Number(row.order_num) || 0,
    }));

    const spends: SpendEntry[] = (spendsRes.data || []).map((row) => ({
      id: String(row.id),
      cat: String(row.cat),
      amount: Number(row.amount) || 0,
      date: String(row.date),
      note: String(row.note || ''),
      member: String(row.member || ''),
      created: row.created ? Number(row.created) : undefined,
    }));

    // Incomes (safe handling if table hasn't been created yet in user's Supabase project)
    let incomes: IncomeEntry[] = [];
    if (!incomesRes.error && Array.isArray(incomesRes.data)) {
      incomes = incomesRes.data.map((row) => ({
        id: String(row.id),
        source: String(row.source || 'Miscellaneous'),
        member: String(row.member || ''),
        amount: Number(row.amount) || 0,
        date: String(row.date),
        note: String(row.note || ''),
        created: row.created ? Number(row.created) : undefined,
      }));
    }

    const d = defCfg();
    let cfg: BudgetConfig = d;
    if (cfgRes.data) {
      cfg = {
        periodStart: cfgRes.data.period_start || d.periodStart,
        periodEnd: cfgRes.data.period_end || d.periodEnd,
        members:
          Array.isArray(cfgRes.data.members) && cfgRes.data.members.length > 0
            ? cfgRes.data.members
            : d.members,
        income: { ...d.income, ...(cfgRes.data.income || {}) },
      };
    } else {
      // Seed default config for this user in Supabase
      await supabase.from('budget_config').upsert({
        user_id: userId,
        period_start: d.periodStart,
        period_end: d.periodEnd,
        income: d.income,
        members: d.members,
        updated_at: new Date().toISOString(),
      });
    }

    return { cats, spends, incomes, cfg };
  } catch (error) {
    console.error('Error fetching Supabase data:', error);
    throw error;
  }
}

export async function seedInitialUserData(userId: string): Promise<{
  cats: Category[];
  spends: SpendEntry[];
  incomes: IncomeEntry[];
  cfg: BudgetConfig;
}> {
  const supabase = getSupabase();
  const cats = defCats();
  const cfg = defCfg();
  if (supabase && userId) {
    const catRows = cats.map((c) => ({
      id: String(c.id),
      user_id: userId,
      name: String(c.name),
      budget: Number(c.budget) || 0,
      order_num: Number(c.order) || 0,
    }));
    await supabase.from('budget_categories').upsert(catRows);
    await supabase.from('budget_config').upsert({
      user_id: userId,
      period_start: cfg.periodStart,
      period_end: cfg.periodEnd,
      income: cfg.income,
      members: cfg.members,
      updated_at: new Date().toISOString(),
    });
  }
  return { cats, spends: [], incomes: [], cfg };
}

export async function saveSpendToSupabase(userId: string, s: SpendEntry) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const row = {
      id: String(s.id),
      user_id: userId,
      cat: String(s.cat),
      amount: Number(s.amount) || 0,
      date: String(s.date),
      note: String(s.note || ''),
      member: String(s.member || ''),
      created: s.created ? Number(s.created) : Date.now(),
    };
    await supabase.from('budget_spends').upsert(row);
  } catch (e) {
    console.error('Save spend error in Supabase:', e);
  }
}

export async function deleteSpendFromSupabase(userId: string, spendId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_spends').delete().match({ user_id: userId, id: spendId });
  } catch (e) {
    console.error('Delete spend error in Supabase:', e);
  }
}

export async function saveIncomeToSupabase(userId: string, inc: IncomeEntry) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const row = {
      id: String(inc.id),
      user_id: userId,
      source: String(inc.source || 'Miscellaneous'),
      member: String(inc.member || ''),
      amount: Number(inc.amount) || 0,
      date: String(inc.date),
      note: String(inc.note || ''),
      created: inc.created ? Number(inc.created) : Date.now(),
    };
    await supabase.from('budget_incomes').upsert(row);
  } catch (e) {
    console.error('Save income error in Supabase:', e);
  }
}

export async function deleteIncomeFromSupabase(userId: string, incomeId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_incomes').delete().match({ user_id: userId, id: incomeId });
  } catch (e) {
    console.error('Delete income error in Supabase:', e);
  }
}

export async function saveCategoryToSupabase(userId: string, c: Category) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const row = {
      id: String(c.id),
      user_id: userId,
      name: String(c.name),
      budget: Number(c.budget) || 0,
      order_num: Number(c.order) || 0,
    };
    await supabase.from('budget_categories').upsert(row);
  } catch (e) {
    console.error('Save category error in Supabase:', e);
  }
}

export async function deleteCategoryFromSupabase(userId: string, catId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_categories').delete().match({ user_id: userId, id: catId });
  } catch (e) {
    console.error('Delete category error in Supabase:', e);
  }
}

export async function saveConfigToSupabase(userId: string, cfg: BudgetConfig) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_config').upsert({
      user_id: userId,
      period_start: cfg.periodStart,
      period_end: cfg.periodEnd,
      income: cfg.income,
      members: cfg.members,
      updated_at: new Date().toISOString(),
    });
  } catch (e) {
    console.error('Save config error in Supabase:', e);
  }
}

export async function resetUserDataInSupabase(
  userId: string
): Promise<{ cats: Category[]; spends: SpendEntry[]; incomes: IncomeEntry[]; cfg: BudgetConfig }> {
  const supabase = getSupabase();
  if (!supabase || !userId) throw new Error('Not connected');
  // Delete all existing spends & incomes
  await supabase.from('budget_spends').delete().eq('user_id', userId);
  await supabase.from('budget_incomes').delete().eq('user_id', userId);
  // Re-seed default categories & config
  return await seedInitialUserData(userId);
}
