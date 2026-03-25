import { Chart } from '../data/chartSetup.js';
import { formatCurrency, formatPercent, marginClass } from '../utils/formatting.js';

let currentSort = { col: null, asc: true };
let cachedData = [];
let containerRef = null;

const CLIENT_COLORS = {
  'JPMorgan Chase': 'rgba(99, 102, 241, 0.8)',
  'Citibank': 'rgba(34, 197, 94, 0.8)',
  'Amazon AWS': 'rgba(245, 158, 11, 0.8)',
};

const columns = [
  { key: 'num', label: '#', fmt: String, cls: '' },
  { key: 'client', label: 'Client', fmt: String, cls: '' },
  { key: 'projectName', label: 'Project', fmt: String, cls: '' },
  { key: 'award', label: 'Contract Award', fmt: v => formatCurrency(v), cls: 'num' },
  { key: 'startMonth', label: 'Start', fmt: String, cls: '' },
  { key: 'grossProfit', label: 'Gross Profit', fmt: v => formatCurrency(v), cls: 'num' },
  { key: 'grossMargin', label: 'Margin', fmt: v => formatPercent(v), cls: 'num', color: true },
];

export function renderProjectCharts(barCanvas, doughnutCanvas, data) {
  const projects = data.filter(d => !d.isTotal);

  // Horizontal bar chart — contract award per project
  const shortNames = projects.map(p => {
    const parts = p.projectName.split(' ');
    return parts.slice(0, 3).join(' ');
  });

  new Chart(barCanvas, {
    type: 'bar',
    data: {
      labels: shortNames,
      datasets: [{
        label: 'Contract Award',
        data: projects.map(p => p.award),
        backgroundColor: projects.map(p => CLIENT_COLORS[p.client] || '#6366f1'),
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: 'y',
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
            title: (items) => projects[items[0].dataIndex].projectName,
            afterTitle: (items) => projects[items[0].dataIndex].client,
            label: (ctx) => `Award: ${formatCurrency(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(42, 42, 62, 0.5)' },
          ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, callback: (v) => formatCurrency(v, true) },
        },
        y: {
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 9, family: 'Inter' } },
        },
      },
    },
  });

  // Doughnut chart — revenue by client
  const clientTotals = {};
  for (const p of projects) {
    clientTotals[p.client] = (clientTotals[p.client] || 0) + p.award;
  }
  const clientNames = Object.keys(clientTotals);
  const clientValues = Object.values(clientTotals);
  const total = clientValues.reduce((a, b) => a + b, 0);

  new Chart(doughnutCanvas, {
    type: 'doughnut',
    data: {
      labels: clientNames,
      datasets: [{
        data: clientValues,
        backgroundColor: clientNames.map(c => CLIENT_COLORS[c] || '#6366f1'),
        borderColor: '#161625',
        borderWidth: 3,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '65%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: { color: '#94a3b8', font: { size: 10, family: 'Inter' }, padding: 12, usePointStyle: true, pointStyleWidth: 8 },
        },
        tooltip: {
          backgroundColor: '#1a1a2e',
          titleColor: '#f1f5f9',
          bodyColor: '#94a3b8',
          borderColor: '#2a2a3e',
          borderWidth: 1,
          callbacks: {
            label: (ctx) => {
              const pct = ((ctx.parsed / total) * 100).toFixed(1);
              return `${ctx.label}: ${formatCurrency(ctx.parsed, true)} (${pct}%)`;
            },
          },
        },
      },
    },
    plugins: [{
      id: 'centerText',
      afterDraw(chart) {
        const { ctx, chartArea } = chart;
        const cx = (chartArea.left + chartArea.right) / 2;
        const cy = (chartArea.top + chartArea.bottom) / 2;
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '600 14px Inter';
        ctx.fillStyle = '#f1f5f9';
        ctx.fillText(formatCurrency(total, true), cx, cy - 8);
        ctx.font = '400 10px Inter';
        ctx.fillStyle = '#64748b';
        ctx.fillText('Total Awards', cx, cy + 10);
        ctx.restore();
      },
    }],
  });
}

function buildTable(data) {
  const regular = data.filter(d => !d.isTotal);
  const totals = data.find(d => d.isTotal);

  let html = '<table><thead><tr>';
  columns.forEach(col => {
    const sortCls = currentSort.col === col.key ? (currentSort.asc ? 'sort-asc' : 'sort-desc') : '';
    html += `<th class="sortable ${col.cls} ${sortCls}" data-col="${col.key}">${col.label}<span class="sort-arrow"></span></th>`;
  });
  html += '</tr></thead><tbody>';

  for (const row of regular) {
    html += '<tr>';
    columns.forEach(col => {
      const val = row[col.key];
      const colorCls = col.color ? marginClass(val) : '';
      html += `<td class="${col.cls} ${colorCls}">${col.fmt(val)}</td>`;
    });
    html += '</tr>';
  }

  if (totals) {
    html += '<tr class="row-total">';
    columns.forEach(col => {
      const val = totals[col.key];
      if (col.key === 'num') {
        html += `<td colspan="3">TOTALS</td>`;
      } else if (col.key === 'client' || col.key === 'projectName') {
        return;
      } else {
        html += `<td class="${col.cls}">${col.fmt(val)}</td>`;
      }
    });
    html += '</tr>';
  }

  html += '</tbody></table>';
  return html;
}

function sortData(col) {
  if (currentSort.col === col) {
    currentSort.asc = !currentSort.asc;
  } else {
    currentSort.col = col;
    currentSort.asc = true;
  }

  const regular = cachedData.filter(d => !d.isTotal);
  regular.sort((a, b) => {
    let va = a[col], vb = b[col];
    if (typeof va === 'string') {
      return currentSort.asc ? va.localeCompare(vb) : vb.localeCompare(va);
    }
    return currentSort.asc ? (va - vb) : (vb - va);
  });

  const totals = cachedData.filter(d => d.isTotal);
  cachedData = [...regular, ...totals];
  containerRef.innerHTML = buildTable(cachedData);
  attachSortListeners();
}

function attachSortListeners() {
  containerRef.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => sortData(th.dataset.col));
  });
}

export function renderProjectDetails(container, data) {
  cachedData = data;
  containerRef = container;
  container.innerHTML = buildTable(data);
  attachSortListeners();
}
