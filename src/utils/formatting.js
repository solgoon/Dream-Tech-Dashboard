export function formatCurrency(value, compact = false) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  if (compact && Math.abs(num) >= 1_000_000) {
    return '$' + (num / 1_000_000).toFixed(1) + 'M';
  }
  if (compact && Math.abs(num) >= 1_000) {
    return '$' + (num / 1_000).toFixed(0) + 'K';
  }
  return num.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

export function formatPercent(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  const pct = num > 1 ? num : num * 100;
  return pct.toFixed(1) + '%';
}

export function formatNumber(value) {
  if (value == null || value === '') return '—';
  const num = Number(value);
  if (isNaN(num)) return '—';
  return num.toLocaleString('en-US');
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_MAP = {
  'January':0,'February':1,'March':2,'April':3,'May':4,'June':5,
  'July':6,'August':7,'September':8,'October':9,'November':10,'December':11
};

export function monthIndex(name) {
  return MONTH_MAP[name] ?? -1;
}

export function shortMonth(name) {
  const idx = monthIndex(name);
  return idx >= 0 ? MONTH_SHORT[idx] : name;
}

export function marginClass(value) {
  const num = Number(value);
  if (isNaN(num)) return '';
  const pct = num > 1 ? num : num * 100;
  if (pct >= 70) return 'margin-good';
  if (pct >= 50) return 'margin-ok';
  return 'margin-bad';
}
