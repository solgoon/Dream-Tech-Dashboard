import { Chart } from '../data/chartSetup.js';
import { shortMonth, formatCurrency } from '../utils/formatting.js';
import { aggregateMonthly, aggregateQuarterly, aggregateAnnual } from '../data/transformers.js';

let chart = null;

function buildDataset(items, isMonthly) {
  const labels = isMonthly
    ? items.map(d => `${shortMonth(d.month)} '${String(d.year).slice(-2)}`)
    : items.map(d => d.label);

  return {
    labels,
    datasets: [
      {
        type: 'bar',
        label: 'Total Revenue',
        data: items.map(d => d.totalRevenue),
        backgroundColor: 'rgba(99, 102, 241, 0.6)',
        borderColor: 'rgba(99, 102, 241, 1)',
        borderWidth: 1,
        borderRadius: 4,
        order: 2,
      },
      {
        type: 'line',
        label: 'Direct Costs',
        data: items.map(d => d.totalDirectCosts),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#ef4444',
        tension: 0.3,
        order: 1,
      },
      {
        type: 'line',
        label: 'Gross Profit',
        data: items.map(d => d.grossProfit),
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#22c55e',
        tension: 0.3,
        order: 1,
      },
      {
        type: 'line',
        label: 'EBITDA',
        data: items.map(d => d.ebitda),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#f59e0b',
        tension: 0.3,
        borderDash: [5, 3],
        order: 1,
      },
    ],
  };
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: {
    mode: 'index',
    intersect: false,
  },
  plugins: {
    legend: {
      position: 'top',
      labels: {
        color: '#94a3b8',
        font: { size: 11, family: 'Inter' },
        padding: 16,
        usePointStyle: true,
        pointStyleWidth: 8,
      },
    },
    tooltip: {
      backgroundColor: '#1a1a2e',
      titleColor: '#f1f5f9',
      bodyColor: '#94a3b8',
      borderColor: '#2a2a3e',
      borderWidth: 1,
      padding: 12,
      titleFont: { family: 'Inter', weight: '600' },
      bodyFont: { family: 'Inter' },
      callbacks: {
        label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.y, true)}`,
      },
    },
  },
  scales: {
    x: {
      grid: { color: 'rgba(42, 42, 62, 0.5)' },
      ticks: { color: '#64748b', font: { size: 11, family: 'Inter' } },
    },
    y: {
      grid: { color: 'rgba(42, 42, 62, 0.5)' },
      ticks: {
        color: '#64748b',
        font: { size: 11, family: 'Inter' },
        callback: (v) => formatCurrency(v, true),
      },
    },
  },
};

export function renderTrendChart(canvas, monthlyData) {
  const monthly = aggregateMonthly(monthlyData, 12);
  const data = buildDataset(monthly, true);

  chart = new Chart(canvas, {
    type: 'bar',
    data,
    options: chartOptions,
  });

  return chart;
}

export function updateTrendChart(period, monthlyData) {
  if (!chart) return;

  let items;
  let isMonthly = false;
  switch (period) {
    case 'monthly':
      items = aggregateMonthly(monthlyData, 12);
      isMonthly = true;
      break;
    case 'quarterly':
      items = aggregateQuarterly(monthlyData, 4);
      break;
    case 'annual':
      items = aggregateAnnual(monthlyData, 3);
      break;
    default:
      return;
  }

  const newData = buildDataset(items, isMonthly);
  chart.data.labels = newData.labels;
  chart.data.datasets.forEach((ds, i) => {
    ds.data = newData.datasets[i].data;
  });
  chart.update();
}
