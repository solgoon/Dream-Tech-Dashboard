import { Chart } from '../data/chartSetup.js';
import { formatCurrency, formatPercent, formatNumber } from '../utils/formatting.js';

export function renderLaborChart(canvas, data) {
  const projects = data.filter(d => !d.isTotal);
  const sorted = [...projects].sort((a, b) => b.totalLabor - a.totalLabor);

  const shortNames = sorted.map(p => {
    const name = p.project;
    return name.length > 30 ? name.slice(0, 30) + '…' : name;
  });

  new Chart(canvas, {
    type: 'bar',
    data: {
      labels: shortNames,
      datasets: [
        {
          label: 'Laborer Cost',
          data: sorted.map(p => p.laborerCost),
          backgroundColor: 'rgba(168, 85, 247, 0.7)',
          borderRadius: 4,
        },
        {
          label: 'Specialist Cost',
          data: sorted.map(p => p.specialistCost),
          backgroundColor: 'rgba(20, 184, 166, 0.7)',
          borderRadius: 4,
        },
      ],
    },
    options: {
      indexAxis: 'y',
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
          callbacks: {
            label: (ctx) => `${ctx.dataset.label}: ${formatCurrency(ctx.parsed.x)}`,
          },
        },
      },
      scales: {
        x: {
          stacked: true,
          grid: { color: 'rgba(42, 42, 62, 0.5)' },
          ticks: { color: '#64748b', font: { size: 10, family: 'Inter' }, callback: (v) => formatCurrency(v, true) },
        },
        y: {
          stacked: true,
          grid: { display: false },
          ticks: { color: '#94a3b8', font: { size: 8, family: 'Inter' } },
        },
      },
    },
  });
}

export function renderLaborDetails(container, data) {
  let html = `<table><thead><tr>
    <th>#</th><th>Project</th>
    <th class="num">Laborers</th><th class="num">Laborer Cost</th>
    <th class="num">Specialists</th><th class="num">Specialist Cost</th>
    <th class="num">Total Labor</th><th class="num">% of Award</th>
  </tr></thead><tbody>`;

  for (const row of data) {
    const cls = row.isTotal ? ' class="row-total"' : '';
    html += `<tr${cls}>
      <td>${row.isTotal ? '' : row.num}</td>
      <td style="white-space:normal;min-width:200px">${row.project}</td>
      <td class="num">${formatNumber(row.laborers)}</td>
      <td class="num">${formatCurrency(row.laborerCost)}</td>
      <td class="num">${formatNumber(row.specialists)}</td>
      <td class="num">${formatCurrency(row.specialistCost)}</td>
      <td class="num">${formatCurrency(row.totalLabor)}</td>
      <td class="num">${formatPercent(row.pctAward)}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}
