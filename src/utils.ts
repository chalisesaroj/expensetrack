import { BudgetConfig, Category, Calculations, SpendEntry, IncomeEntry } from './types';
import { DEFAULT_BUDGET, DEFAULT_MEMBERS, SRC } from './constants';

export function num(v: unknown): number {
  const n = parseFloat(String(v == null ? '' : v));
  return isNaN(n) ? 0 : n;
}

export function today(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function parseD(s: string): number {
  const p = s.split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
}

export function fmtD(s: string): string {
  if (!s) return '';
  return new Date(parseD(s)).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function uid(p: string): string {
  return p + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function defCats(): Category[] {
  return DEFAULT_BUDGET.map((d, i) => ({
    id: 'c' + (i + 1),
    name: d[0],
    budget: d[1],
    order: i + 1,
  }));
}

export function defCfg(): BudgetConfig {
  const yr = new Date().getFullYear();
  return {
    periodStart: yr + '-01-01',
    periodEnd: yr + '-12-31',
    members: [...DEFAULT_MEMBERS],
    income: {
      me: { salary: 0, other: 0 },
      wife: { salary: 0, other: 0 },
      rent: { salary: 0, other: 0 },
    },
  };
}

export function calc(
  cfg: BudgetConfig,
  cats: Category[],
  spends: SpendEntry[],
  incomes: IncomeEntry[] = []
): Calculations {
  const members = cfg.members && cfg.members.length > 0 ? cfg.members : DEFAULT_MEMBERS;

  let totalIncome = 0;
  const incomeByMember: Record<string, number> = {};
  const incomeBySource: Record<string, number> = {};
  const per: Record<string, { s: number; o: number; t: number }> = {};

  members.forEach((m) => {
    incomeByMember[m] = 0;
  });

  if (incomes.length > 0) {
    incomes.forEach((inc) => {
      const a = num(inc.amount);
      totalIncome += a;
      const mem = inc.member || members[0] || 'Unassigned';
      incomeByMember[mem] = (incomeByMember[mem] || 0) + a;
      const src = inc.source || 'Miscellaneous';
      incomeBySource[src] = (incomeBySource[src] || 0) + a;
    });
  } else {
    // Graceful backward-compatibility with previous static income config
    const legacyInc = cfg.income || {};
    SRC.forEach((s) => {
      const d = legacyInc[s[0]] || { salary: 0, other: 0 };
      const a = num(d.salary);
      const o = num(d.other);
      per[s[0]] = { s: a, o: o, t: a + o };
      totalIncome += a + o;
    });
    if (members[0] && per['me']) incomeByMember[members[0]] = per['me'].t;
    if (members[1] && per['wife']) incomeByMember[members[1]] = per['wife'].t;
  }

  const by: Record<string, number> = {};
  const spentByMember: Record<string, number> = {};
  members.forEach((m) => {
    spentByMember[m] = 0;
  });
  spentByMember['Shared'] = 0;

  let spent = 0;
  spends.forEach((e) => {
    const a = num(e.amount);
    by[e.cat] = (by[e.cat] || 0) + a;
    spent += a;
    const mem = e.member || 'Shared';
    spentByMember[mem] = (spentByMember[mem] || 0) + a;
  });

  const netByMember: Record<string, number> = {};
  members.forEach((m) => {
    const inc = incomeByMember[m] || 0;
    const sp = spentByMember[m] || 0;
    netByMember[m] = inc - sp;
  });

  let budget = 0;
  let proj = 0;
  const known: Record<string, number> = {};
  cats.forEach((c) => {
    const b = num(c.budget);
    known[c.id] = 1;
    budget += b;
    proj += Math.max(b, by[c.id] || 0);
  });

  Object.keys(by).forEach((k) => {
    if (!known[k]) proj += by[k];
  });

  const a = parseD(cfg.periodStart);
  const b = parseD(cfg.periodEnd) + 86400000;
  const frac = Math.min(1, Math.max(0, (Date.now() - a) / (b - a)));

  return {
    income: totalIncome,
    incomeByMember,
    incomeBySource,
    spentByMember,
    netByMember,
    per,
    by,
    spent,
    budget,
    proj,
    frac,
    projSave: totalIncome - proj,
    planSave: totalIncome - budget,
    bestSave: totalIncome - spent,
  };
}

export function verdict(n: number): [string, string] {
  return n > 0 ? ['Surplus', 'good'] : n < 0 ? ['Deficit', 'bad'] : ['Break-even', ''];
}

export function status(spent: number, budget: number, frac: number): 'over' | 'watch' | 'ok' {
  if (spent > budget) return 'over';
  if (budget > 0 && spent / budget > frac + 0.1) return 'watch';
  return 'ok';
}

function csvCell(v: unknown): string {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function generateReportCsv(
  from: string,
  to: string,
  rows: SpendEntry[],
  cats: Category[]
): string {
  const names: Record<string, string> = {};
  const bud: Record<string, number> = {};
  cats.forEach((k) => {
    names[k.id] = k.name;
    bud[k.id] = num(k.budget);
  });

  const byCat: Record<string, { count: number; sum: number }> = {};
  rows.forEach((r) => {
    if (!byCat[r.cat]) byCat[r.cat] = { count: 0, sum: 0 };
    byCat[r.cat].count += 1;
    byCat[r.cat].sum += num(r.amount);
  });

  const out: string[] = [];
  out.push('Budget Book Report');
  out.push(`Range: ${from} to ${to}`);
  out.push('');
  out.push('Category Summary');
  out.push(['Category', 'Entries', 'Spent (Rs)', 'Annual Budget (Rs)', 'Diff vs Budget'].map(csvCell).join(','));

  const seen = new Set(Object.keys(byCat));
  cats.forEach((k) => {
    seen.delete(k.id);
    const sum = byCat[k.id]?.sum || 0;
    const cnt = byCat[k.id]?.count || 0;
    out.push([k.name, cnt, sum, k.budget, sum - k.budget].map(csvCell).join(','));
  });

  seen.forEach((id) => {
    const sum = byCat[id]?.sum || 0;
    const cnt = byCat[id]?.count || 0;
    out.push([names[id] || 'Removed (' + id + ')', cnt, sum, 0, sum].map(csvCell).join(','));
  });

  const totalSpent = rows.reduce((t, r) => t + num(r.amount), 0);
  out.push(['Total', rows.length, totalSpent, '', ''].map(csvCell).join(','));

  out.push('');
  out.push('Itemised Entries');
  out.push(['Date', 'Category', 'Spent By', 'Amount (Rs)', 'Note'].map(csvCell).join(','));

  rows.forEach((r) => {
    out.push([
      r.date,
      names[r.cat] || r.cat,
      r.member || 'Shared',
      num(r.amount),
      r.note || '',
    ].map(csvCell).join(','));
  });

  return '\uFEFF' + out.join('\r\n');
}

export function generateIncomeReportCsv(
  from: string,
  to: string,
  rows: IncomeEntry[]
): string {
  const out: string[] = [];
  out.push('Budget Book - Income Report');
  out.push(`Range: ${from} to ${to}`);
  out.push('');
  out.push(['Date', 'Received By', 'Source', 'Amount (Rs)', 'Note'].map(csvCell).join(','));

  rows.forEach((r) => {
    out.push([
      r.date,
      r.member || '',
      r.source || '',
      num(r.amount),
      r.note || '',
    ].map(csvCell).join(','));
  });

  const totalIncome = rows.reduce((t, r) => t + num(r.amount), 0);
  out.push(['Total', '', '', totalIncome, ''].map(csvCell).join(','));

  return '\uFEFF' + out.join('\r\n');
}

export function money(n: number): string {
  const sign = n < 0 ? '−' : '';
  const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
  return sign + 'Rs ' + nf.format(Math.abs(Math.round(n)));
}
