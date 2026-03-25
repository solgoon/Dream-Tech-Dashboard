import { formatCurrency, formatNumber } from '../utils/formatting.js';

export function renderEquipmentResale(container, data) {
  let totalItems = 0;
  let totalRevenue = 0;

  let html = `<table><thead><tr>
    <th>Quarter</th><th>Period</th><th class="num">Items</th>
    <th>Description</th><th class="num">Revenue</th><th>Buyer</th>
  </tr></thead><tbody>`;

  for (const row of data) {
    totalItems += row.itemsSold;
    totalRevenue += row.revenue;
    html += `<tr>
      <td>${row.quarter}</td>
      <td>${row.period}</td>
      <td class="num">${formatNumber(row.itemsSold)}</td>
      <td style="white-space:normal;min-width:180px">${row.description}</td>
      <td class="num">${formatCurrency(row.revenue)}</td>
      <td>${row.buyerType}</td>
    </tr>`;
  }

  html += `<tr class="row-total">
    <td colspan="2">TOTAL</td>
    <td class="num">${formatNumber(totalItems)}</td>
    <td></td>
    <td class="num">${formatCurrency(totalRevenue)}</td>
    <td></td>
  </tr>`;

  html += '</tbody></table>';
  container.innerHTML = html;
}
