import { Chart } from '../data/chartSetup.js';
import { formatCurrency, formatPercent } from '../utils/formatting.js';

function renderSparkline(canvas, data, color) {
  new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.map((_, i) => i),
      datasets: [{
        data,
        borderColor: color,
        borderWidth: 1.5,
        pointRadius: 0,
        tension: 0.4,
        fill: false,
      }],
    },
    options: {
      responsive: false,
      plugins: { legend: { display: false }, tooltip: { enabled: false } },
      scales: {
        x: { display: false },
        y: { display: false },
      },
      animation: false,
    },
  });
}

export function renderKpiBar(container, { annualSummary, monthlyPL, projectDetails }) {
  const findRow = (metric) => annualSummary.find(r => r.metric === metric);
  const totalValue = (row) => row ? Number(row.values[4]) || 0 : 0;

  const totalRevenue = totalValue(findRow('Total Revenue'));
  const grossProfit = totalValue(findRow('GROSS PROFIT'));
  const ebitda = totalValue(findRow('EBITDA'));
  const netIncome = totalValue(findRow('NET INCOME'));
  const grossMargin = totalValue(findRow('Gross Margin %'));
  const ebitdaMargin = totalValue(findRow('EBITDA Margin %'));
  const projectCount = projectDetails.filter(p => !p.isTotal).length;
  const latest = monthlyPL[monthlyPL.length - 1];
  const latestLabel = latest ? `${latest.month} ${latest.year}` : '';

  const trailing12 = monthlyPL.slice(-12);

  const kpis = [
    { label: 'Total Revenue', value: formatCurrency(totalRevenue, true), cls: 'accent', sub: 'All-time cumulative', sparkId: 'spark-rev' },
    { label: 'Gross Profit', value: formatCurrency(grossProfit, true), cls: 'positive', sub: formatPercent(grossMargin) + ' margin', sparkId: null },
    { label: 'EBITDA', value: formatCurrency(ebitda, true), cls: 'accent', sub: formatPercent(ebitdaMargin) + ' margin', sparkId: 'spark-ebitda' },
    { label: 'Net Income', value: formatCurrency(netIncome, true), cls: 'positive', sub: 'After tax provisions', sparkId: null },
    { label: 'Projects', value: String(projectCount), cls: '', sub: 'Completed & active', sparkId: null },
    { label: 'Latest Month', value: formatCurrency(latest?.totalRevenue, true), cls: '', sub: latestLabel, sparkId: null },
  ];

  container.innerHTML = kpis.map(k => `
    <div class="kpi-tile">
      <span class="kpi-label">${k.label}</span>
      <div class="kpi-value-row">
        <span class="kpi-value ${k.cls}">${k.value}</span>
        ${k.sparkId ? `<canvas id="${k.sparkId}" class="mini-chart" width="60" height="24"></canvas>` : ''}
      </div>
      <span class="kpi-sub">${k.sub}</span>
    </div>
  `).join('');

  // Render sparklines
  const revCanvas = document.getElementById('spark-rev');
  if (revCanvas) renderSparkline(revCanvas, trailing12.map(d => d.totalRevenue), '#818cf8');

  const ebitdaCanvas = document.getElementById('spark-ebitda');
  if (ebitdaCanvas) renderSparkline(ebitdaCanvas, trailing12.map(d => d.ebitda), '#818cf8');
}
