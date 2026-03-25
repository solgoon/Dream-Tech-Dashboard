import { Chart } from '../data/chartSetup.js';
import { formatCurrency, formatNumber } from '../utils/formatting.js';

const YEAR_COLORS = {
  '2023': 'rgba(99, 102, 241, 0.7)',
  '2024': 'rgba(34, 197, 94, 0.7)',
  '2025': 'rgba(245, 158, 11, 0.7)',
  '2026': 'rgba(168, 85, 247, 0.7)',
};

function getYearFromQuarter(q) {
  const match = String(q).match(/\d{4}/);
  return match ? match[0] : '2023';
}

export function renderEquipmentChart(canvas, data) {
  const chartData = data.filter(r => !r.isTotal);
  const labels = chartData.map(r => r.quarter);
  const revenues = chartData.map(r => r.revenue);
  const colors = chartData.map(r => YEAR_COLORS[getYearFromQuarter(r.quarter)] || YEAR_COLORS['2023']);

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Revenue',
        data: revenues,
        backgroundColor: colors,
        borderRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#2a2a3e',
          borderWidth: 1,
          callbacks: {
            afterLabel: (ctx) => `Items sold: ${chartData[ctx.dataIndex].itemsSold}`,
            label: (ctx) => `Revenue: ${formatCurrency(ctx.parsed.y)}`,
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: '#64748b', font: { size: 9, family: 'Inter' }, maxRotation: 45 } },
        y: {
          grid: { color: 'rgba(42, 42, 62, 0.5)' },
          ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, callback: (v) => formatCurrency(v, true) },
        },
      },
    },
  });
}

export function renderEquipmentResale(container, data) {
  const rows = data.filter(r => !r.isTotal);
  let totalItems = 0;
  let totalRevenue = 0;

  let html = `<table><thead><tr>
    <th>Quarter</th><th class="num">Items</th>
    <th>Description</th><th class="num">Revenue</th>
  </tr></thead><tbody>`;

  for (const row of rows) {
    totalItems += row.itemsSold;
    totalRevenue += row.revenue;
    const desc = row.description.length > 40 ? row.description.slice(0, 40) + '…' : row.description;
    html += `<tr>
      <td>${row.quarter}</td>
      <td class="num">${formatNumber(row.itemsSold)}</td>
      <td style="white-space:normal;min-width:140px" title="${row.description}">${desc}</td>
      <td class="num">${formatCurrency(row.revenue)}</td>
    </tr>`;
  }

  html += `<tr class="row-total">
    <td>TOTAL</td>
    <td class="num">${formatNumber(totalItems)}</td>
    <td></td>
    <td class="num">${formatCurrency(totalRevenue)}</td>
  </tr>`;

  html += '</tbody></table>';
  container.innerHTML = html;
}
