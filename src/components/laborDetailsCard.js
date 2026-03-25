import { formatCurrency, formatPercent, formatNumber } from '../utils/formatting.js';

export function renderLaborDetails(container, data) {
  let html = `<table><thead><tr>
    <th>#</th><th>Project</th>
    <th class="num">Laborers</th><th class="num">Weeks</th><th class="num">Laborer Cost</th>
    <th class="num">Specialists</th><th class="num">Weeks</th><th class="num">Specialist Cost</th>
    <th class="num">Total Labor</th><th class="num">% of Award</th>
  </tr></thead><tbody>`;

  for (const row of data) {
    const cls = row.isTotal ? ' class="row-total"' : '';
    html += `<tr${cls}>
      <td>${row.isTotal ? '' : row.num}</td>
      <td style="white-space:normal;min-width:200px">${row.project}</td>
      <td class="num">${formatNumber(row.laborers)}</td>
      <td class="num">${formatNumber(row.labWeeks)}</td>
      <td class="num">${formatCurrency(row.laborerCost)}</td>
      <td class="num">${formatNumber(row.specialists)}</td>
      <td class="num">${formatNumber(row.specWeeks)}</td>
      <td class="num">${formatCurrency(row.specialistCost)}</td>
      <td class="num">${formatCurrency(row.totalLabor)}</td>
      <td class="num">${formatPercent(row.pctAward)}</td>
    </tr>`;
  }

  html += '</tbody></table>';
  container.innerHTML = html;
}
