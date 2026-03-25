import { formatCurrency, formatPercent } from '../utils/formatting.js';

export function renderKpiBar(container, { annualSummary, monthlyPL, projectDetails }) {
  // Extract key values from annual summary
  const findRow = (metric) => annualSummary.find(r => r.metric === metric);

  const totalRevRow = findRow('Total Revenue');
  const grossProfitRow = findRow('GROSS PROFIT');
  const ebitdaRow = findRow('EBITDA');
  const netIncomeRow = findRow('NET INCOME');
  const grossMarginRow = findRow('Gross Margin %');
  const ebitdaMarginRow = findRow('EBITDA Margin %');

  const totalValue = (row) => row ? Number(row.values[4]) || 0 : 0;

  const totalRevenue = totalValue(totalRevRow);
  const grossProfit = totalValue(grossProfitRow);
  const ebitda = totalValue(ebitdaRow);
  const netIncome = totalValue(netIncomeRow);
  const grossMargin = totalValue(grossMarginRow);
  const ebitdaMargin = totalValue(ebitdaMarginRow);

  const projectCount = projectDetails.filter(p => !p.isTotal).length;

  // Latest month data
  const latest = monthlyPL[monthlyPL.length - 1];
  const latestLabel = latest ? `${latest.month} ${latest.year}` : '';

  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue, true), cls: 'accent', sub: 'All-time cumulative' },
    { label: 'Gross Profit', value: formatCurrency(grossProfit, true), cls: 'positive', sub: formatPercent(grossMargin) + ' margin' },
    { label: 'EBITDA', value: formatCurrency(ebitda, true), cls: 'accent', sub: formatPercent(ebitdaMargin) + ' margin' },
    { label: 'Net Income', value: formatCurrency(netIncome, true), cls: 'positive', sub: 'After tax provisions' },
    { label: 'Projects', value: String(projectCount), cls: '', sub: 'Completed & active' },
    { label: 'Latest Month', value: formatCurrency(latest?.totalRevenue, true), cls: '', sub: latestLabel },
  ];

  container.innerHTML = kpis.map(k => `
    <div class="kpi-tile">
      <span class="kpi-label">${k.label}</span>
      <span class="kpi-value ${k.cls}">${k.value}</span>
      <span class="kpi-sub">${k.sub}</span>
    </div>
  `).join('');
}
