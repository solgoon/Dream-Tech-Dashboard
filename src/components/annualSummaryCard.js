import { Chart } from '../data/chartSetup.js';
import { formatCurrency, formatPercent } from '../utils/formatting.js';

const SUMMARY_METRICS = [
  'Total Revenue', 'Total Direct Costs', 'GROSS PROFIT', 'Gross Margin %',
  'Total Overhead', 'EBITDA', 'EBITDA Margin %', 'Total Tax Provision', 'NET INCOME', 'Net Margin %'
];

export function renderAnnualSummaryChart(canvas, data) {
  const yearLabels = ['2023', '2024', '2025', '2026 (Q1)'];

  const findValues = (metric) => {
    const row = data.find(r => r.metric === metric);
    return row ? row.values.slice(0, 4).map(v => Number(v) || 0) : [0, 0, 0, 0];
  };

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: yearLabels,
      datasets: [
        {
          label: 'Total Revenue',
          data: findValues('Total Revenue'),
          backgroundColor: 'rgba(99, 102, 241, 0.7)',
          borderRadius: 4,
        },
        {
          label: 'Direct Costs',
          data: findValues('Total Direct Costs'),
          backgroundColor: 'rgba(239, 68, 68, 0.7)',
          borderRadius: 4,
        },
        {
          label: 'EBITDA',
          data: findValues('EBITDA'),
          backgroundColor: 'rgba(245, 158, 11, 0.7)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' }, usePointStyle: true, pointStyleWidth: 8, padding: 12 },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#2a2a3e',
          borderWidth: 1,
          callbacks: { label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, true)}` },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 10, family: 'Inter' } } },
        y: {
          grid: { color: 'rgba(42, 42, 62, 0.5)' },
          ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, callback: (v) => formatCurrency(v, true) },
        },
      },
    },
  });
}

export function renderAnnualSummary(container, data) {
  const yearHeaders = ['2023', '2024', '2025', '2026 (Q1)', 'TOTAL'];
  const summaryRows = data.filter(r => SUMMARY_METRICS.includes(r.metric));

  let html = '<table><thead><tr><th>Metric</th>';
  yearHeaders.forEach(y => { html += `<th class="num">${y}</th>`; });
  html += '</tr></thead><tbody>';

  for (const row of summaryRows) {
    const isBold = ['GROSS PROFIT', 'EBITDA', 'NET INCOME'].includes(row.metric);
    const cls = isBold ? ' class="row-total"' : '';
    html += `<tr${cls}><td>${row.metric}</td>`;

    for (const v of row.values) {
      if (v === '' || v == null) {
        html += '<td class="num">—</td>';
      } else if (row.isPercent) {
        html += `<td class="num">${formatPercent(v)}</td>`;
      } else {
        html += `<td class="num">${formatCurrency(v)}</td>`;
      }
    }
    html += '</tr>';
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}
