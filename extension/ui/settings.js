import { MESSAGE_TYPES } from '../lib/constants.js';

let excludedSites = new Set();
let allSites = [];

document.addEventListener('DOMContentLoaded', init);

async function init() {
  setupEventListeners();
  await loadSettings();
  await loadSites();
}

function setupEventListeners() {
  document.getElementById('clearTodayBtn').addEventListener('click', () => clearData('today'));
  document.getElementById('clear7DaysBtn').addEventListener('click', () => clearData('7days'));
  document.getElementById('clearAllBtn').addEventListener('click', () => clearData('all'));
}

async function loadSettings() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.GET_SETTINGS, {});
    excludedSites = new Set(response?.settings?.excludedSites || []);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function loadSites() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'year' });
    if (response?.summary?.sites) {
      allSites = Object.keys(response.summary.sites).sort();
      displaySites();
    }
  } catch (error) {
    console.error('Error loading sites:', error);
  }
}

function displaySites() {
  const container = document.getElementById('sitesList');
  
  if (allSites.length === 0) {
    container.innerHTML = '<p class="empty">No sites visited yet. Browse some websites to see them here.</p>';
    return;
  }
  
  // Clear container first
  container.innerHTML = '';
  
  allSites.forEach(site => {
    const isExcluded = excludedSites.has(site);
    
    // Create elements safely to prevent XSS
    const siteItem = document.createElement('div');
    siteItem.className = `site-item ${isExcluded ? 'excluded' : ''}`;
    
    const siteInfo = document.createElement('div');
    siteInfo.className = 'site-info';
    
    const siteName = document.createElement('strong');
    siteName.textContent = site; // Safe text insertion
    siteInfo.appendChild(siteName);
    
    if (isExcluded) {
      const badge = document.createElement('span');
      badge.className = 'badge excluded';
      badge.textContent = 'Excluded';
      siteInfo.appendChild(badge);
    }
    
    const siteActions = document.createElement('div');
    siteActions.className = 'site-actions';
    
    const btn = document.createElement('button');
    btn.className = 'exclude-btn';
    btn.textContent = isExcluded ? 'Include' : 'Exclude';
    btn.dataset.site = site;
    btn.addEventListener('click', () => toggleExclude(site));
    siteActions.appendChild(btn);
    
    siteItem.appendChild(siteInfo);
    siteItem.appendChild(siteActions);
    container.appendChild(siteItem);
  });
}

async function toggleExclude(site) {
  if (excludedSites.has(site)) {
    excludedSites.delete(site);
  } else {
    excludedSites.add(site);
  }
  
  try {
    await sendMessage(MESSAGE_TYPES.UPDATE_SETTINGS, { 
      excludedSites: Array.from(excludedSites)
    });
    displaySites();
  } catch (error) {
    alert('Error updating settings: ' + error.message);
  }
}

async function clearData(type) {
  const confirmMsg = type === 'all' ? 
    'Clear ALL tracking data? This cannot be undone!' :
    `Clear data from ${type === 'today' ? 'today' : 'the last 7 days'}?`;
  
  if (!confirm(confirmMsg)) return;
  
  let before = null;
  if (type === 'today') {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    before = today;
  } else if (type === '7days') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    before = weekAgo;
  }
  
  try {
    await sendMessage(MESSAGE_TYPES.CLEAR_DATA, { before });
    alert('Data cleared successfully');
  } catch (error) {
    alert('Error clearing data: ' + error.message);
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
