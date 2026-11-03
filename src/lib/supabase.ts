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

export const SQL_MIGRATION_SCRIPT = `-- Run this in Supabase Dashboard -> SQL Editor -> Click 'Run'
-- Safely adds 'member' column to expenses (no data lost!)
alter table public.budget_spends add column if not exists member text default '';

-- Safely adds 'members' column to config
alter table public.budget_config add column if not exists members jsonb default '["Husband", "Wife"]'::jsonb;

-- Create budget_incomes table for transactional family income
create table if not exists public.budget_incomes (
  id text not null,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  source text not null,
  member text not null default '',
  amount numeric not null default 0,
  date text not null,
  note text not null default '',
  created bigint,
  created_at timestamptz not null default now(),
  primary key (user_id, id)
);

alter table public.budget_incomes enable row level security;

drop policy if exists "Users can select own incomes" on public.budget_incomes;
create policy "Users can select own incomes" on public.budget_incomes for select using (auth.uid() = user_id);

drop policy if exists "Users can insert own incomes" on public.budget_incomes;
create policy "Users can insert own incomes" on public.budget_incomes for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update own incomes" on public.budget_incomes;
create policy "Users can update own incomes" on public.budget_incomes for update using (auth.uid() = user_id);

drop policy if exists "Users can delete own incomes" on public.budget_incomes;
create policy "Users can delete own incomes" on public.budget_incomes for delete using (auth.uid() = user_id);
`;

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

// ----------------- Schema Verification -----------------

export async function checkSchemaStatus(): Promise<{
  hasMemberCol: boolean;
  hasIncomesTable: boolean;
}> {
  const supabase = getSupabase();
  if (!supabase) return { hasMemberCol: false, hasIncomesTable: false };

  let hasMemberCol = true;
  let hasIncomesTable = true;

  try {
    // Check if member column exists on budget_spends
    const { error: spendsErr } = await supabase.from('budget_spends').select('member').limit(1);
    if (spendsErr && (spendsErr.code === '42703' || spendsErr.message?.toLowerCase().includes('member'))) {
      hasMemberCol = false;
    }
  } catch {
    hasMemberCol = false;
  }

  try {
    // Check if budget_incomes table exists
    const { error: incomesErr } = await supabase.from('budget_incomes').select('id').limit(1);
    if (incomesErr && (incomesErr.code === '42P01' || incomesErr.message?.toLowerCase().includes('budget_incomes'))) {
      hasIncomesTable = false;
    }
  } catch {
    hasIncomesTable = false;
  }

  return { hasMemberCol, hasIncomesTable };
}

// ----------------- Supabase Data Operations -----------------

export async function fetchRemoteBudgetData(userId: string): Promise<{
  cats: Category[];
  spends: SpendEntry[];
  incomes: IncomeEntry[];
  cfg: BudgetConfig;
  schemaNotice?: boolean;
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

    const spends: SpendEntry[] = (spendsRes.data || []).map((row) => {
      let memberVal = String(row.member || '');
      let noteVal = String(row.note || '');

      // Fallback: If member column wasn't in DB yet, extract from note prefix [MemberName]
      if (!memberVal && noteVal.startsWith('[')) {
        const match = noteVal.match(/^\[(.*?)\]\s*(.*)$/);
        if (match) {
          memberVal = match[1];
          noteVal = match[2];
        }
      }

      return {
        id: String(row.id),
        cat: String(row.cat),
        amount: Number(row.amount) || 0,
        date: String(row.date),
        note: noteVal,
        member: memberVal,
        created: row.created ? Number(row.created) : undefined,
      };
    });

    let incomes: IncomeEntry[] = [];
    let schemaNotice = false;

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
    } else {
      // If budget_incomes table does not exist in user's Supabase project yet
      schemaNotice = true;
      // Check if any incomes were backed up inside budget_config's income jsonb
      if (cfgRes.data?.income?._incomes && Array.isArray(cfgRes.data.income._incomes)) {
        incomes = cfgRes.data.income._incomes;
      }
    }

    const d = defCfg();
    let cfg: BudgetConfig = d;
    if (cfgRes.data) {
      const storedMembers =
        (Array.isArray(cfgRes.data.members) && cfgRes.data.members.length > 0 && cfgRes.data.members) ||
        (Array.isArray(cfgRes.data.income?._members) && cfgRes.data.income._members.length > 0 && cfgRes.data.income._members) ||
        d.members;

      cfg = {
        periodStart: cfgRes.data.period_start || d.periodStart,
        periodEnd: cfgRes.data.period_end || d.periodEnd,
        members: storedMembers,
        income: { ...d.income, ...(cfgRes.data.income || {}) },
      };
    } else {
      // Seed default config for this user in Supabase
      await supabase.from('budget_config').upsert({
        user_id: userId,
        period_start: d.periodStart,
        period_end: d.periodEnd,
        income: { ...d.income, _members: d.members },
        members: d.members,
        updated_at: new Date().toISOString(),
      });
    }

    return { cats, spends, incomes, cfg, schemaNotice };
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
      income: { ...cfg.income, _members: cfg.members },
      members: cfg.members,
      updated_at: new Date().toISOString(),
    });
  }
  return { cats, spends: [], incomes: [], cfg };
}

export async function saveSpendToSupabase(
  userId: string,
  s: SpendEntry
): Promise<{ success: boolean; needsMigration?: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !userId) return { success: false, error: 'Not connected' };

  // First try saving with member column
  const rowWithMember = {
    id: String(s.id),
    user_id: userId,
    cat: String(s.cat),
    amount: Number(s.amount) || 0,
    date: String(s.date),
    note: String(s.note || ''),
    member: String(s.member || ''),
    created: s.created ? Number(s.created) : Date.now(),
  };

  const { error } = await supabase.from('budget_spends').upsert(rowWithMember);

  if (!error) {
    return { success: true };
  }

  console.warn('Upsert with member column failed, attempting safe fallback:', error.message);

  // If column "member" does not exist in user's Supabase table yet (code 42703)
  if (error.code === '42703' || error.message?.toLowerCase().includes('member')) {
    const noteWithMember = s.member ? `[${s.member}] ${s.note || ''}`.trim() : String(s.note || '');
    const rowWithoutMember = {
      id: String(s.id),
      user_id: userId,
      cat: String(s.cat),
      amount: Number(s.amount) || 0,
      date: String(s.date),
      note: noteWithMember,
      created: s.created ? Number(s.created) : Date.now(),
    };
    const { error: fallbackError } = await supabase.from('budget_spends').upsert(rowWithoutMember);
    if (!fallbackError) {
      return { success: true, needsMigration: true };
    }
    return { success: false, error: fallbackError.message };
  }

  return { success: false, error: error.message };
}

export async function deleteSpendFromSupabase(userId: string, spendId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const { error } = await supabase.from('budget_spends').delete().match({ user_id: userId, id: spendId });
    if (error) console.error('Delete spend error:', error.message);
  } catch (e) {
    console.error('Delete spend error in Supabase:', e);
  }
}

export async function saveIncomeToSupabase(
  userId: string,
  inc: IncomeEntry
): Promise<{ success: boolean; needsMigration?: boolean; error?: string }> {
  const supabase = getSupabase();
  if (!supabase || !userId) return { success: false, error: 'Not connected' };

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

  const { error } = await supabase.from('budget_incomes').upsert(row);

  if (!error) {
    return { success: true };
  }

  console.warn('Upsert to budget_incomes failed:', error.message);

  // If budget_incomes table does not exist in user's Supabase project yet (code 42P01)
  if (error.code === '42P01' || error.message?.toLowerCase().includes('budget_incomes')) {
    // Save income into budget_config.income._incomes backup so data is NEVER lost!
    await backupIncomeToConfigJson(userId, inc);
    return { success: true, needsMigration: true };
  }

  return { success: false, error: error.message };
}

async function backupIncomeToConfigJson(userId: string, inc: IncomeEntry) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const { data: cfgRow } = await supabase.from('budget_config').select('income').maybeSingle();
    const currentIncome = cfgRow?.income || {};
    const existingList: IncomeEntry[] = Array.isArray(currentIncome._incomes) ? currentIncome._incomes : [];
    const updatedList = existingList.filter((item) => item.id !== inc.id);
    updatedList.push(inc);

    await supabase.from('budget_config').upsert({
      user_id: userId,
      income: {
        ...currentIncome,
        _incomes: updatedList,
      },
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Backup income to config json failed:', err);
  }
}

export async function deleteIncomeFromSupabase(userId: string, incomeId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const { error } = await supabase.from('budget_incomes').delete().match({ user_id: userId, id: incomeId });
    if (error && (error.code === '42P01' || error.message?.toLowerCase().includes('budget_incomes'))) {
      // Remove from budget_config backup
      const { data: cfgRow } = await supabase.from('budget_config').select('income').maybeSingle();
      if (cfgRow?.income?._incomes) {
        const updatedList = cfgRow.income._incomes.filter((item: IncomeEntry) => item.id !== incomeId);
        await supabase.from('budget_config').upsert({
          user_id: userId,
          income: { ...cfgRow.income, _incomes: updatedList },
          updated_at: new Date().toISOString(),
        });
      }
    }
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
    const { error } = await supabase.from('budget_categories').upsert(row);
    if (error) console.error('Save category error:', error.message);
  } catch (e) {
    console.error('Save category error in Supabase:', e);
  }
}

export async function deleteCategoryFromSupabase(userId: string, catId: string) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const { error } = await supabase.from('budget_categories').delete().match({ user_id: userId, id: catId });
    if (error) console.error('Delete category error:', error.message);
  } catch (e) {
    console.error('Delete category error in Supabase:', e);
  }
}

export async function saveConfigToSupabase(userId: string, cfg: BudgetConfig) {
  const supabase = getSupabase();
  if (!supabase || !userId) return;
  try {
    const baseConfig = {
      user_id: userId,
      period_start: cfg.periodStart,
      period_end: cfg.periodEnd,
      income: {
        ...(cfg.income || {}),
        _members: cfg.members,
      },
      updated_at: new Date().toISOString(),
    };

    // Try saving with members column
    const { error } = await supabase.from('budget_config').upsert({
      ...baseConfig,
      members: cfg.members,
    });

    // If members column does not exist yet (code 42703), save baseConfig without top-level members column
    if (error && (error.code === '42703' || error.message?.toLowerCase().includes('members'))) {
      await supabase.from('budget_config').upsert(baseConfig);
    }
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
  try {
    await supabase.from('budget_incomes').delete().eq('user_id', userId);
  } catch {
    // Ignore if table missing
  }
  // Re-seed default categories & config
  return await seedInitialUserData(userId);
}
