import { createClient, SupabaseClient, User } from '@supabase/supabase-js';
import { BudgetConfig, Category, SpendEntry } from '../types';

const STORAGE_URL_KEY = 'budget_supabase_url';
const STORAGE_ANON_KEY = 'budget_supabase_anon_key';

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
  const k = raw.trim();
  if (!k) return '';
  try {
    const parts = k.split('.');
    if (parts.length >= 2) {
      const payload = JSON.parse(atob(parts[1]));
      if (payload.role === 'service_role') {
        localStorage.removeItem(STORAGE_ANON_KEY);
        return DEFAULT_SUPABASE_ANON_KEY;
      }
    }
  } catch {
    // ignore
  }
  return k;
}

export function getSupabaseCredentials(): { url: string; key: string; isConfigured: boolean } {
  const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
  const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

  const localUrl = localStorage.getItem(STORAGE_URL_KEY) || '';
  const localKey = localStorage.getItem(STORAGE_ANON_KEY) || '';

  const rawUrl = envUrl || localUrl || DEFAULT_SUPABASE_URL;
  const rawKey = envKey || localKey || DEFAULT_SUPABASE_ANON_KEY;

  const url = cleanSupabaseUrl(rawUrl);
  const key = cleanSupabaseKey(rawKey);

  if (localUrl && localUrl !== url) {
    localStorage.setItem(STORAGE_URL_KEY, url);
  }

  return {
    url,
    key,
    isConfigured: Boolean(url && key),
  };
}

export function resetToDefaultSupabaseCredentials() {
  localStorage.removeItem(STORAGE_URL_KEY);
  localStorage.removeItem(STORAGE_ANON_KEY);
  cachedClient = null;
  currentUrl = '';
  currentKey = '';
}

export function saveCustomSupabaseCredentials(url: string, key: string) {
  const cleanUrl = cleanSupabaseUrl(url);
  const cleanKey = cleanSupabaseKey(key);

  if (cleanUrl) localStorage.setItem(STORAGE_URL_KEY, cleanUrl);
  else localStorage.removeItem(STORAGE_URL_KEY);

  if (cleanKey) localStorage.setItem(STORAGE_ANON_KEY, cleanKey);
  else localStorage.removeItem(STORAGE_ANON_KEY);

  cachedClient = null;
  currentUrl = '';
  currentKey = '';
}

export function getSupabase(): SupabaseClient | null {
  const { url, key, isConfigured } = getSupabaseCredentials();
  if (!isConfigured) return null;

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
  cats?: Category[];
  spends?: SpendEntry[];
  cfg?: BudgetConfig;
} | null> {
  const supabase = getSupabase();
  if (!supabase || !userId) return null;

  try {
    const [catsRes, spendsRes, cfgRes] = await Promise.all([
      supabase.from('budget_categories').select('*').order('order_num', { ascending: true }),
      supabase.from('budget_spends').select('*').order('date', { ascending: true }),
      supabase.from('budget_config').select('*').maybeSingle(),
    ]);

    if (catsRes.error) throw catsRes.error;
    if (spendsRes.error) throw spendsRes.error;

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
      created: row.created ? Number(row.created) : undefined,
    }));

    let cfg: BudgetConfig | undefined = undefined;
    if (cfgRes.data) {
      cfg = {
        periodStart: cfgRes.data.period_start,
        periodEnd: cfgRes.data.period_end,
        income: cfgRes.data.income || {},
      };
    }

    return { cats, spends, cfg };
  } catch (error) {
    console.error('Error fetching Supabase data:', error);
    throw error;
  }
}

export async function pushFullBudgetToSupabase(
  userId: string,
  cats: Category[],
  spends: SpendEntry[],
  cfg: BudgetConfig
): Promise<{ catsCount: number; spendsCount: number }> {
  const supabase = getSupabase();
  if (!supabase || !userId) throw new Error('Supabase client or user ID is missing');

  // 1. Sync Categories
  let catsCount = 0;
  if (cats.length > 0) {
    const catRows = cats.map((c) => ({
      id: String(c.id),
      user_id: userId,
      name: String(c.name),
      budget: Number(c.budget) || 0,
      order_num: Number(c.order) || 0,
    }));
    const { error: catErr } = await supabase.from('budget_categories').upsert(catRows);
    if (catErr) {
      console.error('Error upserting categories:', catErr);
      throw new Error(`Failed to sync categories: ${catErr.message}`);
    }
    catsCount = catRows.length;
  }

  // 2. Sync Spends
  let spendsCount = 0;
  if (spends.length > 0) {
    const spendRows = spends.map((s) => ({
      id: String(s.id),
      user_id: userId,
      cat: String(s.cat),
      amount: Number(s.amount) || 0,
      date: String(s.date),
      note: String(s.note || ''),
      created: s.created ? Number(s.created) : Date.now(),
    }));
    const { error: spendErr } = await supabase.from('budget_spends').upsert(spendRows);
    if (spendErr) {
      console.error('Error upserting spends:', spendErr);
      throw new Error(`Failed to sync expenses: ${spendErr.message}`);
    }
    spendsCount = spendRows.length;
  }

  // 3. Sync Config
  const { error: cfgErr } = await supabase.from('budget_config').upsert({
    user_id: userId,
    period_start: cfg.periodStart,
    period_end: cfg.periodEnd,
    income: cfg.income,
    updated_at: new Date().toISOString(),
  });
  if (cfgErr) {
    console.error('Error upserting config:', cfgErr);
    throw new Error(`Failed to sync config: ${cfgErr.message}`);
  }

  return { catsCount, spendsCount };
}

export async function upsertSingleSpend(userId: string, s: SpendEntry) {
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
      created: s.created ? Number(s.created) : Date.now(),
    };
    await supabase.from('budget_spends').upsert(row);
  } catch (e) {
    console.error('Auto-sync spend error:', e);
  }
}

export async function deleteSpendFromSupabase(userId: string, spendId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_spends').delete().match({ user_id: userId, id: spendId });
  } catch (e) {
    console.error('Delete spend error:', e);
  }
}

export async function upsertSingleCategory(userId: string, c: Category) {
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
    console.error('Auto-sync category error:', e);
  }
}

export async function deleteCategoryFromSupabase(userId: string, catId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    await supabase.from('budget_categories').delete().match({ user_id: userId, id: catId });
  } catch (e) {
    console.error('Delete category error:', e);
  }
}
