import './styles/index.css';
import { fetchAllTabs } from './data/sheetsApi.js';
import {
  transformMonthlyPL,
  transformProjectDetails,
  transformAnnualSummary,
  transformEquipmentResale,
  transformLaborDetail,
} from './data/transformers.js';
import { renderKpiBar } from './components/kpiBar.js';
import { renderTrendChart, updateTrendChart } from './components/revenueTrendChart.js';
import { renderAnnualSummary, renderAnnualSummaryChart } from './components/annualSummaryCard.js';
import { renderEquipmentResale, renderEquipmentChart } from './components/equipmentResaleCard.js';
import { renderProjectDetails, renderProjectCharts } from './components/projectDetailsTable.js';
import { renderLaborDetails, renderLaborChart } from './components/laborDetailsCard.js';

async function init() {
  const loading = document.getElementById('loading');
  const dashboard = document.getElementById('dashboard');
  const lastUpdated = document.getElementById('last-updated');

  try {
    const raw = await fetchAllTabs();

    const monthlyPL = transformMonthlyPL(raw.monthlyPL);
    const projectDetails = transformProjectDetails(raw.projectDetails);
    const annualSummary = transformAnnualSummary(raw.annualSummary);
    const equipmentResale = transformEquipmentResale(raw.equipmentResale);
    const laborDetail = transformLaborDetail(raw.laborDetail);

    // Hide loading, show dashboard
    loading.style.display = 'none';
    dashboard.style.display = '';

    // KPI bar (with sparklines)
    renderKpiBar(document.getElementById('kpi-bar'), { annualSummary, monthlyPL, projectDetails });

    // Trend chart
    const canvas = document.getElementById('trend-chart');
    renderTrendChart(canvas, monthlyPL);

    // Trend toggle
    const toggleGroup = document.getElementById('trend-toggle');
    toggleGroup.addEventListener('click', (e) => {
      const btn = e.target.closest('.toggle-btn');
      if (!btn) return;
      toggleGroup.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      updateTrendChart(btn.dataset.period, monthlyPL);
    });

    // Annual summary — chart + condensed table
    renderAnnualSummaryChart(document.getElementById('annual-chart'), annualSummary);
    renderAnnualSummary(document.getElementById('annual-summary-table'), annualSummary);

    // Equipment resale — chart + trimmed table
    renderEquipmentChart(document.getElementById('equipment-chart'), equipmentResale);
    renderEquipmentResale(document.getElementById('equipment-table'), equipmentResale);

    // Project details — bar + doughnut charts + trimmed table
    renderProjectCharts(
      document.getElementById('projects-bar-chart'),
      document.getElementById('projects-doughnut-chart'),
      projectDetails
    );
    renderProjectDetails(document.getElementById('projects-table'), projectDetails);

    // Labor details — stacked bar chart + trimmed table
    renderLaborChart(document.getElementById('labor-chart'), laborDetail);
    renderLaborDetails(document.getElementById('labor-table'), laborDetail);

    // Last updated
    lastUpdated.textContent = `Last updated: ${new Date().toLocaleString()}`;

  } catch (err) {
    console.error('Dashboard init error:', err);
    loading.innerHTML = `<p style="color: var(--danger);">Failed to load dashboard data.</p><p style="color: var(--text-muted);">${err.message}</p>`;
  }
}

init();
