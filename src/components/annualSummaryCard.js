import { formatCurrency, formatPercent } from '../utils/formatting.js';

export function renderAnnualSummary(container, data) {
  const yearHeaders = ['2023', '2024', '2025', '2026 (Q1)', 'TOTAL'];

  let html = '<table><thead><tr><th>Metric</th>';
  yearHeaders.forEach(y => { html += `<th class="num">${y}</th>`; });
  html += '</tr></thead><tbody>';

  for (const row of data) {
    if (row.isSection && !row.values.some(v => v !== '' && v != null && v !== 0)) {
      html += `<tr class="row-section"><td colspan="6">${row.metric}</td></tr>`;
      continue;
    }

    const cls = row.isSummaryLine ? ' class="row-total"' : '';
    html += `<tr${cls}>`;
    html += `<td${row.isIndented ? ' class="indent"' : ''}>${row.metric}</td>`;

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
