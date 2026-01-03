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
    excludedSites = new Set(response.payload?.excludedSites || []);
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

async function loadSites() {
  try {
    const response = await sendMessage(MESSAGE_TYPES.GET_SUMMARY, { period: 'year' });
    if (response.payload?.sites) {
      allSites = Object.keys(response.payload.sites).sort();
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
  
  container.innerHTML = allSites.map(site => {
    const isExcluded = excludedSites.has(site);
    return `
      <div class="site-item ${isExcluded ? 'excluded' : ''}">
        <div class="site-info">
          <strong>${site}</strong>
          ${isExcluded ? '<span class="badge excluded">Excluded</span>' : ''}
        </div>
        <div class="site-actions">
          <button class="exclude-btn" data-site="${site}">
            ${isExcluded ? 'Include' : 'Exclude'}
          </button>
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.exclude-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleExclude(btn.dataset.site));
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
