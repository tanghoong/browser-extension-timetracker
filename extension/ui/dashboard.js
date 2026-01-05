import { MESSAGE_TYPES } from '../lib/constants.js';
import { formatTime } from '../lib/utils.js';

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
      updateCurrentSession(message.state || message);
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
    const [dayData, weekData, monthData] = await Promise.all([
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'day' }),
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'week' }),
      sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'month' })
    ]);
    
    // Update summary cards - response format is { summary: { sites: {...} } }
    const daySites = dayData?.summary?.sites || {};
    const weekSites = weekData?.summary?.sites || {};
    const monthSites = monthData?.summary?.sites || {};
    
    updateSummaryCard('today', daySites);
    updateSummaryCard('week', weekSites);
    updateSummaryCard('month', monthSites);
    
    // Update site filter
    updateSiteFilter(daySites);
    
    // Get series data for chart
    const seriesData = await sendMessage(MESSAGE_TYPES.GET_SERIES, { period: currentPeriod, siteKey: currentSite });
    updateChart(seriesData?.series || []);
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
  
  // Clear all options except the first one (All Sites)
  while (filter.options.length > 1) {
    filter.options.remove(1);
  }
  
  // Add sites sorted by time
  const siteList = Object.entries(sites)
    .sort((a, b) => (b[1].seconds || 0) - (a[1].seconds || 0));
  
  for (const [siteKey] of siteList) {
    const option = document.createElement('option');
    option.value = siteKey;
    option.textContent = siteKey;
    filter.appendChild(option);
  }
  
  // Restore previous selection if still valid
  if (currentValue && Array.from(filter.options).some(opt => opt.value === currentValue)) {
    filter.value = currentValue;
  }
}

async function loadCurrentSession() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.GET_CURRENT_SESSION, {});
    updateCurrentSession(response?.state);
  } catch (error) {
    console.error('Error loading current session:', error);
  }
}

function updateCurrentSession(session) {
  const statusEl = document.getElementById('sessionStatus');
  if (!statusEl) return;
  
  if (!session?.isActive) {
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
  
  // Set canvas dimensions
  canvas.width = canvas.offsetWidth;
  canvas.height = 300; // Increased height for better visibility
  
  if (!series || series.length === 0) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#666';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('No data to display', canvas.width / 2, canvas.height / 2);
    return;
  }
  
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Check if we have site-level data for stacking
  const hasStacking = series.some(point => point.sites && Object.keys(point.sites).length > 0);
  
  if (hasStacking && !currentSite) {
    // Render stacked bar chart with top 3 sites + Others
    renderStackedChart(ctx, canvas, series);
  } else {
    // Render simple bar chart (for single site or when no site data available)
    renderSimpleChart(ctx, canvas, series);
  }
}

function renderSimpleChart(ctx, canvas, series) {
  const BAR_SPACING = 4;
  const MAX_BAR_WIDTH = 60;
  const BOTTOM_MARGIN = 50;
  
  const maxSeconds = Math.max(...series.map(s => s.seconds), 1);
  const barWidth = Math.min(canvas.width / series.length - BAR_SPACING, MAX_BAR_WIDTH);
  const maxBarHeight = canvas.height - BOTTOM_MARGIN;
  
  series.forEach((point, i) => {
    const barHeight = (point.seconds / maxSeconds) * maxBarHeight;
    const x = i * (barWidth + BAR_SPACING);
    const y = canvas.height - barHeight - 30;
    
    ctx.fillStyle = '#4CAF50';
    ctx.fillRect(x, y, barWidth, barHeight);
    
    // Numeric indicator on top of bar
    if (point.seconds > 0) {
      ctx.fillStyle = '#333';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatTime(point.seconds), x + barWidth / 2, y - 5);
    }
    
    // Date label
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const label = point.date.split('-').slice(1).join('/');
    ctx.fillText(label, x + barWidth / 2, canvas.height - 15);
  });
}

function renderStackedChart(ctx, canvas, series) {
  // Constants
  const COLORS = ['#2196F3', '#4CAF50', '#FF9800', '#9E9E9E'];
  const BAR_SPACING = 8;
  const MAX_BAR_WIDTH = 60;
  const BOTTOM_MARGIN = 60;
  const MIN_SEGMENT_HEIGHT_FOR_LABEL = 20;
  const LEGEND_MARGIN = 10;
  const MAX_SITE_NAME_LENGTH = 15;
  const TRUNCATED_SITE_NAME_LENGTH = 12;
  
  const barWidth = Math.min(canvas.width / series.length - BAR_SPACING, MAX_BAR_WIDTH);
  const maxBarHeight = canvas.height - BOTTOM_MARGIN;
  
  // Find top 3 sites across all dates
  const siteSeconds = {};
  series.forEach(point => {
    if (point.sites) {
      Object.entries(point.sites).forEach(([site, data]) => {
        siteSeconds[site] = (siteSeconds[site] || 0) + data.seconds;
      });
    }
  });
  
  const topSites = Object.entries(siteSeconds)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([site]) => site);
  
  // Calculate max total seconds for scaling
  const maxSeconds = Math.max(...series.map(point => point.seconds), 1);
  
  // Draw stacked bars
  series.forEach((point, i) => {
    if (!point.sites || Object.keys(point.sites).length === 0) return;
    
    const x = i * (barWidth + BAR_SPACING);
    let currentY = canvas.height - 40;
    
    // Stack segments: top 3 sites + others
    const segments = [];
    let othersSeconds = 0;
    
    // Add top 3 sites
    topSites.forEach(site => {
      if (point.sites[site]) {
        segments.push({
          site: site,
          seconds: point.sites[site].seconds,
          isOther: false
        });
      }
    });
    
    // Aggregate remaining sites as "Others"
    Object.entries(point.sites).forEach(([site, data]) => {
      if (!topSites.includes(site)) {
        othersSeconds += data.seconds;
      }
    });
    
    if (othersSeconds > 0) {
      segments.push({
        site: 'Others',
        seconds: othersSeconds,
        isOther: true
      });
    }
    
    // Draw segments from bottom to top
    segments.reverse().forEach((segment) => {
      const segmentHeight = (segment.seconds / maxSeconds) * maxBarHeight;
      currentY -= segmentHeight;
      
      // Safely get color index, defaulting to gray for Others
      let colorIndex;
      if (segment.isOther) {
        colorIndex = 3;
      } else {
        colorIndex = topSites.indexOf(segment.site);
        // Fallback to gray if site not found (should not happen)
        if (colorIndex === -1) {
          colorIndex = 3;
        }
      }
      
      ctx.fillStyle = COLORS[colorIndex];
      ctx.fillRect(x, currentY, barWidth, segmentHeight);
      
      // Add numeric indicator if segment is tall enough
      if (segmentHeight > MIN_SEGMENT_HEIGHT_FOR_LABEL) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(formatTime(segment.seconds), x + barWidth / 2, currentY + segmentHeight / 2 + 4);
      }
    });
    
    // Date label below bar
    ctx.fillStyle = '#666';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    const label = point.date.split('-').slice(1).join('/');
    ctx.fillText(label, x + barWidth / 2, canvas.height - 25);
    
    // Total time above bar
    if (point.seconds > 0) {
      ctx.fillStyle = '#333';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(formatTime(point.seconds), x + barWidth / 2, currentY - 5);
    }
  });
  
  // Draw legend
  const legendY = canvas.height - LEGEND_MARGIN;
  let legendX = LEGEND_MARGIN;
  
  topSites.forEach((site, index) => {
    ctx.fillStyle = COLORS[index];
    ctx.fillRect(legendX, legendY, 12, 12);
    
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    const siteName = site.length > MAX_SITE_NAME_LENGTH 
      ? site.substring(0, TRUNCATED_SITE_NAME_LENGTH) + '...' 
      : site;
    ctx.fillText(siteName, legendX + 16, legendY + 10);
    
    legendX += ctx.measureText(siteName).width + 30;
  });
  
  // Add "Others" to legend if there are more than 3 sites
  if (Object.keys(siteSeconds).length > 3) {
    ctx.fillStyle = COLORS[3];
    ctx.fillRect(legendX, legendY, 12, 12);
    
    ctx.fillStyle = '#333';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('Others', legendX + 16, legendY + 10);
  }
}

async function exportData() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.EXPORT_CSV, { 
      period: currentPeriod, 
      siteKey: currentSite 
    });
    
    const csv = response?.csv || '';
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
