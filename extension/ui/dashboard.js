import { MESSAGE_TYPES, TIME_PERIODS } from '../lib/constants.js';
import { formatTime, formatTimeHMS } from '../lib/utils.js';

let currentPeriod = 'day';
let currentSite = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await loadData();
  await loadCurrentSession();
  
  // Listen for tracking updates
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === MESSAGE_TYPES.TRACKING_UPDATE) {
      updateCurrentSession(message.payload);
    }
  });
  
  // Refresh every 5 seconds
  setInterval(() => loadData(), 5000);
}

function setupEventListeners() {
  // Period selector
  document.querySelectorAll('.period-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentPeriod = e.target.dataset.period;
      loadData();
    });
  });
  
  // Site filter
  document.getElementById('siteFilter').addEventListener('change', (e) => {
    currentSite = e.target.value || null;
    loadData();
  });
  
  // Export button
  document.getElementById('exportBtn').addEventListener('click', exportData);
}

async function loadData() {
  try {
    // Get summary for all periods
    const [dayData, weekData, monthData, periodData] = await Promise.all([
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'day' }),
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'week' }),
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'month' }),
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: currentPeriod, siteKey: currentSite })
    ]);
    
    // Update summary cards
    updateSummaryCard('today', dayData.payload.sites);
    updateSummaryCard('week', weekData.payload.sites);
    updateSummaryCard('month', monthData.payload.sites);
    
    // Update site filter
    updateSiteFilter(dayData.payload.sites);
    
    // Get series data for chart
    const seriesData = await sendMessage(MESSAGE_TYPES.GET_SERIES, { period: currentPeriod, siteKey: currentSite });
    updateChart(seriesData.payload);
  } catch (error) {
    console.error('Error loading data:', error);
  }
}

function updateSummaryCard(period, sites) {
  let totalSeconds = 0;
  let totalVisits = 0;
  
  for (const site of Object.values(sites)) {
    totalSeconds += site.seconds || 0;
    totalVisits += site.visits || 0;
  }
  
  document.getElementById(`${period}Time`).textContent = formatTime(totalSeconds);
  document.getElementById(`${period}Visits`).textContent = `${totalVisits} visits`;
}

function updateSiteFilter(sites) {
  const filter = document.getElementById('siteFilter');
  const currentValue = filter.value;
  
  // Keep first option (All Sites)
  filter.innerHTML = '<option value="">All Sites</option>';
  
  // Add sites sorted by time
  const siteList = Object.entries(sites)
    .sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0));
  
  for (const [siteKey] of siteList) {
    const option = document.createElement('option');
    option.value = siteKey;
    option.textContent = siteKey;
    filter.appendChild(option);
  }
  
  filter.value = currentValue;
}

async function loadCurrentSession() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.GET_CURRENT_SESSION, {});
    updateCurrentSession(response.payload);
  } catch (error) {
    console.error('Error loading current session:', error);
  }
}

function updateCurrentSession(session) {
  const statusEl = document.getElementById('sessionStatus');
  
  if (!session || !session.isActive) {
    statusEl.textContent = 'Not tracking';
    statusEl.className = '';
  } else {
    statusEl.textContent = `Tracking: ${session.siteKey} - ${formatTime(session.seconds)}`;
    statusEl.className = 'active';
  }
}

function updateChart(series) {
  const canvas = document.getElementById('chart');
  const ctx = canvas.getContext('2d');
  
  // Simple bar chart
  canvas.width = canvas.offsetWidth;
  canvas.height = 200;
  
  if (!series || series.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  const maxSeconds = Math.max(...series.map(s => s.seconds), 1);
  const barWidth = canvas.width / series.length - 4;
  const maxBarHeight = canvas.height - 30;
  
  series.forEach((point, i) => {
    const barHeight = (point.seconds / maxSeconds) * maxBarHeight;
    const x = i * (barWidth + 4);
    const y = canvas.height - barHeight - 20;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Label
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const label = point.date.split('-').slice(1).join('/');
    ctx.fillText(label, x + barWidth / 2, canvas.height - 5);
  });
}

async function exportData() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.EXPORT_CSV, { 
      period: currentPeriod, 
      siteKey: currentSite 
    });
    
    const csv = response.payload.csv;
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timetracker-${currentPeriod}-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error exporting data:', error);
    alert('Failed to export data');
  }
}

function sendMessage(type, payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage({ type, payload }, (response) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else if (response && response.type === MESSAGE_TYPES.ERROR) {
        reject(new Error(response.error));
      } else {
        resolve(response);
      }
    });
  });
}
