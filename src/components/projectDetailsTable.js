import { formatCurrency, formatPercent, marginClass } from '../utils/formatting.js';

let currentSort = { col: null, asc: true };
let cachedData = [];
let containerRef = null;

const columns = [
  { key: 'num', label: '#', fmt: String, cls: '' },
  { key: 'client', label: 'Client', fmt: String, cls: '' },
  { key: 'projectName', label: 'Project', fmt: String, cls: '' },
  { key: 'award', label: 'Contract Award', fmt: v => formatCurrency(v), cls: 'num' },
  { key: 'startMonth', label: 'Start', fmt: String, cls: '' },
  { key: 'duration', label: 'Weeks', fmt: String, cls: 'num' },
  { key: 'laborers', label: 'Laborers', fmt: String, cls: 'num' },
  { key: 'specialists', label: 'Specialists', fmt: String, cls: 'num' },
  { key: 'directCost', label: 'Direct Cost', fmt: v => formatCurrency(v), cls: 'num' },
  { key: 'grossProfit', label: 'Gross Profit', fmt: v => formatCurrency(v), cls: 'num' },
  { key: 'grossMargin', label: 'Margin', fmt: v => formatPercent(v), cls: 'num', color: true },
];

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
