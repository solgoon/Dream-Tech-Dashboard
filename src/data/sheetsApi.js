import { SHEET_ID, TABS, CACHE_KEY, CACHE_TTL } from './constants.js';
import { fallbackData } from './fallbackData.js';

function parseGVizResponse(text) {
  const match = text.match(/google\.visualization\.Query\.setResponse\(({.*})\)/s);
  if (!match) throw new Error('Invalid GViz response');
  const json = JSON.parse(match[1]);
  if (json.status === 'error') throw new Error(json.errors?.[0]?.message || 'GViz error');

  const table = json.table;
  const headers = table.cols.map(c => c.label);
  const rows = table.rows.map(r =>
    r.c.map(cell => {
      if (!cell || cell.v == null) return '';
      return cell.v;
    })
  );
  return { headers, rows };
}

async function fetchTabFromSheets(tabName) {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(tabName)}`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  const text = await resp.text();
  return parseGVizResponse(text);
}

function getCache() {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw);
    if (Date.now() - cached.ts > CACHE_TTL) {
      sessionStorage.removeItem(CACHE_KEY);
      return null;
    }
    return cached.data;
  } catch {
    return null;
  }
}

function setCache(data) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data }));
  } catch { /* ignore quota errors */ }
}

export async function fetchAllTabs() {
  const cached = getCache();
  if (cached) return cached;

  try {
    const [monthlyPL, projectDetails, annualSummary, equipmentResale, laborDetail] = await Promise.all([
      fetchTabFromSheets(TABS.monthlyPL),
      fetchTabFromSheets(TABS.projectDetails),
      fetchTabFromSheets(TABS.annualSummary),
      fetchTabFromSheets(TABS.equipmentResale),
      fetchTabFromSheets(TABS.laborDetail),
    ]);
    const data = { monthlyPL, projectDetails, annualSummary, equipmentResale, laborDetail };
    setCache(data);
    return data;
  } catch (err) {
    console.warn('Google Sheets fetch failed, using fallback data:', err.message);
    return fallbackData;
  }
}
