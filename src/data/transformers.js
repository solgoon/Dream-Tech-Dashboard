import { monthIndex } from '../utils/formatting.js';

// Column index helpers for Monthly P&L
const PL = {
  month: 0, year: 1, projectRevenue: 2, equipmentResale: 3, totalRevenue: 4,
  unionLabor: 5, specialists: 6, transportation: 7, storage: 8, insurance: 9,
  meals: 10, certFees: 11, totalDirectCosts: 12, grossProfit: 13, grossMargin: 14,
  ownerSalary: 15, accountant: 16, attorney: 17, officeAdmin: 18, totalOverhead: 19,
  ebitda: 20, ebitdaMargin: 21
};

export function transformMonthlyPL(raw) {
  return raw.rows
    .filter(r => r[PL.month] && r[PL.year] && String(r[PL.month]) !== 'GRAND TOTAL')
    .map(r => ({
      month: String(r[PL.month]),
      year: Number(r[PL.year]),
      monthIdx: monthIndex(String(r[PL.month])),
      totalRevenue: Number(r[PL.totalRevenue]) || 0,
      projectRevenue: Number(r[PL.projectRevenue]) || 0,
      equipmentResale: Number(r[PL.equipmentResale]) || 0,
      totalDirectCosts: Number(r[PL.totalDirectCosts]) || 0,
      grossProfit: Number(r[PL.grossProfit]) || 0,
      grossMargin: Number(r[PL.grossMargin]) || 0,
      totalOverhead: Number(r[PL.totalOverhead]) || 0,
      ebitda: Number(r[PL.ebitda]) || 0,
      ebitdaMargin: Number(r[PL.ebitdaMargin]) || 0,
    }));
}

export function aggregateMonthly(data, trailing = 12) {
  return data.slice(-trailing);
}

export function aggregateQuarterly(data, trailingQuarters = 4) {
  const quarters = {};
  for (const row of data) {
    const q = Math.ceil((row.monthIdx + 1) / 3);
    const key = `Q${q} '${String(row.year).slice(-2)}`;
    if (!quarters[key]) {
      quarters[key] = { label: key, year: row.year, q, totalRevenue: 0, totalDirectCosts: 0, grossProfit: 0, ebitda: 0, count: 0 };
    }
    quarters[key].totalRevenue += row.totalRevenue;
    quarters[key].totalDirectCosts += row.totalDirectCosts;
    quarters[key].grossProfit += row.grossProfit;
    quarters[key].ebitda += row.ebitda;
    quarters[key].count++;
  }
  const sorted = Object.values(quarters).sort((a, b) => a.year - b.year || a.q - b.q);
  return sorted.slice(-trailingQuarters);
}

export function aggregateAnnual(data, trailingYears = 3) {
  const years = {};
  for (const row of data) {
    const key = String(row.year);
    if (!years[key]) {
      years[key] = { label: key, year: row.year, totalRevenue: 0, totalDirectCosts: 0, grossProfit: 0, ebitda: 0, count: 0 };
    }
    years[key].totalRevenue += row.totalRevenue;
    years[key].totalDirectCosts += row.totalDirectCosts;
    years[key].grossProfit += row.grossProfit;
    years[key].ebitda += row.ebitda;
    years[key].count++;
  }
  const sorted = Object.values(years).sort((a, b) => a.year - b.year);
  return sorted.slice(-trailingYears);
}

// Project Details
const PD = {
  num: 0, client: 1, projectName: 2, award: 3, startMonth: 4,
  duration: 5, laborers: 6, specialists: 7, laborCost: 8,
  directCost: 9, grossProfit: 10, grossMargin: 11
};

export function transformProjectDetails(raw) {
  return raw.rows.map(r => ({
    num: r[PD.num],
    client: String(r[PD.client]),
    projectName: String(r[PD.projectName]),
    award: Number(r[PD.award]) || 0,
    startMonth: String(r[PD.startMonth]),
    duration: Number(r[PD.duration]) || 0,
    laborers: Number(r[PD.laborers]) || 0,
    specialists: Number(r[PD.specialists]) || 0,
    laborCost: Number(r[PD.laborCost]) || 0,
    directCost: Number(r[PD.directCost]) || 0,
    grossProfit: Number(r[PD.grossProfit]) || 0,
    grossMargin: Number(r[PD.grossMargin]) || 0,
    isTotal: String(r[PD.num]).toUpperCase().includes('TOTAL') || String(r[PD.client]).toUpperCase().includes('TOTAL'),
  }));
}

// Annual Summary - row-based, keep as-is with section info
const SECTION_HEADERS = ['REVENUE', 'DIRECT COSTS', 'GROSS PROFIT', 'OVERHEAD', 'EBITDA', 'TAX PROVISION', 'NET INCOME'];

export function transformAnnualSummary(raw) {
  const rows = [];
  for (const r of raw.rows) {
    const metric = String(r[0]).trim();
    if (!metric) continue;

    const isSection = SECTION_HEADERS.includes(metric);
    const isIndented = metric.startsWith('  ');
    const isPercent = metric.includes('Margin %') || metric.includes('Tax Rate');
    const isSummaryLine = ['Gross Margin %', 'EBITDA Margin %', 'Net Margin %', 'GROSS PROFIT', 'EBITDA', 'NET INCOME'].includes(metric.trim());

    rows.push({
      metric: metric.trim(),
      values: [r[1], r[2], r[3], r[4], r[5]],
      isSection,
      isIndented: isIndented && !isSection,
      isPercent,
      isSummaryLine,
    });
  }
  return rows;
}

// Equipment Resale
export function transformEquipmentResale(raw) {
  return raw.rows.map(r => ({
    quarter: String(r[0]),
    period: String(r[1]),
    itemsSold: Number(r[2]) || 0,
    description: String(r[3]),
    revenue: Number(r[4]) || 0,
    buyerType: String(r[5]),
    isTotal: String(r[0]).toUpperCase().includes('TOTAL'),
  }));
}

// Labor Detail
const LD = {
  num: 0, project: 1, laborers: 2, labWeeks: 3, laborerCost: 4,
  specialists: 5, specWeeks: 6, specialistCost: 7, totalLabor: 8, pctAward: 9
};

export function transformLaborDetail(raw) {
  return raw.rows.map(r => ({
    num: r[LD.num],
    project: String(r[LD.project]),
    laborers: Number(r[LD.laborers]) || 0,
    labWeeks: Number(r[LD.labWeeks]) || 0,
    laborerCost: Number(r[LD.laborerCost]) || 0,
    specialists: Number(r[LD.specialists]) || 0,
    specWeeks: Number(r[LD.specWeeks]) || 0,
    specialistCost: Number(r[LD.specialistCost]) || 0,
    totalLabor: Number(r[LD.totalLabor]) || 0,
    pctAward: Number(r[LD.pctAward]) || 0,
    isTotal: String(r[LD.num]) === 'TOTALS' || String(r[LD.project]).includes('TOTAL'),
  }));
}
