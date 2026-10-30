import { DEFAULT_BUDGET, SRC } from './constants';
import { BudgetConfig, Category, Calculations, SpendEntry } from './types';

const nf = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 2 });

export function money(n: number): string {
  return (n < 0 ? '−' : '') + 'Rs ' + nf.format(Math.abs(n));
}

export function num(v: unknown): number {
  const n = parseFloat(String(v == null ? '' : v).replace(/,/g, ''));
  return isFinite(n) && n > 0 ? n : 0;
}

export function today(): string {
  return new Date().toLocaleDateString('en-CA');
}

export function parseD(s: string): number {
  const p = String(s).split('-');
  return new Date(+p[0], +p[1] - 1, +p[2]).getTime();
}

export function fmtD(s: string): string {
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
  spends: SpendEntry[]
): Calculations {
  const inc = cfg.income || {};
  let income = 0;
  const per: Record<string, { s: number; o: number; t: number }> = {};
  SRC.forEach((s) => {
    const d = inc[s[0]] || { salary: 0, other: 0 };
    const a = num(d.salary);
    const o = num(d.other);
    per[s[0]] = { s: a, o: o, t: a + o };
    income += a + o;
  });

  const by: Record<string, number> = {};
  let spent = 0;
  spends.forEach((e) => {
    const a = num(e.amount);
    by[e.cat] = (by[e.cat] || 0) + a;
    spent += a;
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
    income,
    per,
    by,
    spent,
    budget,
    proj,
    frac,
    projSave: income - proj,
    planSave: income - budget,
    bestSave: income - spent,
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

  const out: (string | number)[][] = [];
  out.push(['Budget Book report']);
  out.push(['From', from, 'To', to]);
  out.push([]);
  out.push(['Date', 'Category', 'Note', 'Amount (Rs)']);

  let tot = 0;
  const by: Record<string, number> = {};
  const order: string[] = [];

  rows.forEach((e) => {
    const a = num(e.amount);
    tot += a;
    if (!(e.cat in by)) {
      by[e.cat] = 0;
      order.push(e.cat);
    }
    by[e.cat] += a;
    out.push([e.date, names[e.cat] || 'Removed category', e.note || '', a]);
  });

  out.push(['', '', 'Total', tot]);
  out.push([]);
  out.push(['Summary by category']);
  out.push(['Category', 'Spent in period (Rs)', 'Annual budget (Rs)']);

  order
    .sort((a, b) => (names[a] || '').localeCompare(names[b] || ''))
    .forEach((id) => {
      out.push([names[id] || 'Removed category', by[id], id in bud ? bud[id] : '']);
    });

  return '\uFEFF' + out.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
