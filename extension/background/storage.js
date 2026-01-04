/**
 * Storage module for Time Tracker extension
 * Handles all storage operations including daily buckets and aggregations
 */

import { STORAGE_KEYS, DEFAULT_SETTINGS, ERROR_MESSAGES } from '../lib/constants.js';
import { getDateKey, getDateKeysForPeriod, escapeCSV } from '../lib/utils.js';

/**
 * Get settings from storage
 * @returns {Promise<Object>} Settings object
 */
export async function getSettings() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  return result[STORAGE_KEYS.SETTINGS] || DEFAULT_SETTINGS;
}

/**
 * Update settings in storage
 * @param {Object} settings - Settings to update
 * @returns {Promise<void>}
 */
export async function updateSettings(settings) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SETTINGS]: settings
  });
}

/**
 * Get daily stats for a specific date
 * @param {string} dateKey - Date key (YYYY-MM-DD)
 * @returns {Promise<Object>} Stats object
 */
async function getDayStats(dateKey) {
  const key = `${STORAGE_KEYS.STATS_PREFIX}${dateKey}`;
  const result = await chrome.storage.local.get(key);
  return result[key] || { sites: {}, updatedAt: Date.now() };
}

/**
 * Save session data (time and visits) to storage
 * @param {string} siteKey - Site identifier
 * @param {number} seconds - Seconds to add
 * @param {number} visits - Visits to add
 * @param {number} timestamp - Timestamp of the session
 * @returns {Promise<void>}
 */
export async function saveSession(siteKey, seconds, visits = 0, timestamp = Date.now()) {
  const dateKey = getDateKey(new Date(timestamp));
  const storageKey = `${STORAGE_KEYS.STATS_PREFIX}${dateKey}`;
  
  // Get current day's stats
  const stats = await getDayStats(dateKey);
  
  // Initialize site data if doesn't exist
  if (!stats.sites[siteKey]) {
    stats.sites[siteKey] = { seconds: 0, visits: 0 };
  }
  
  // Add to existing data
  stats.sites[siteKey].seconds += seconds;
  stats.sites[siteKey].visits += visits;
  stats.updatedAt = Date.now();
  
  // Save back to storage
  try {
    await chrome.storage.local.set({ [storageKey]: stats });
  } catch (error) {
    if (error.message && error.message.includes('QUOTA')) {
      throw new Error(ERROR_MESSAGES.STORAGE_QUOTA_EXCEEDED);
    }
    throw error;
  }
}

/**
 * Get aggregated summary for a period
 * @param {string} period - Period type (day, week, month, quarter, year)
 * @param {string|null} siteKey - Specific site or null for all
 * @param {Date} date - End date (defaults to today)
 * @returns {Promise<Object>} Summary object { sites: { [key]: { seconds, visits } } }
 */
export async function getSummary(period, siteKey = null, date = new Date()) {
  const dateKeys = getDateKeysForPeriod(period, date);
  const storageKeys = dateKeys.map(dk => `${STORAGE_KEYS.STATS_PREFIX}${dk}`);
  
  // Get all relevant daily stats
  const result = await chrome.storage.local.get(storageKeys);
  
  // Aggregate data
  const summary = { sites: {} };
  
  for (const key of storageKeys) {
    const dayStats = result[key];
    if (!dayStats || !dayStats.sites) continue;
    
    for (const [site, data] of Object.entries(dayStats.sites)) {
      // Filter by siteKey if specified
      if (siteKey && site !== siteKey) continue;
      
      if (!summary.sites[site]) {
        summary.sites[site] = { seconds: 0, visits: 0 };
      }
      
      summary.sites[site].seconds += data.seconds || 0;
      summary.sites[site].visits += data.visits || 0;
    }
  }
  
  return summary;
}

/**
 * Get time series data for charts
 * @param {string} period - Period type (day, week, month, quarter, year)
 * @param {string|null} siteKey - Specific site or null for all
 * @returns {Promise<Array>} Array of { date, seconds, visits }
 */
export async function getSeries(period, siteKey = null) {
  const dateKeys = getDateKeysForPeriod(period);
  const storageKeys = dateKeys.map(dk => `${STORAGE_KEYS.STATS_PREFIX}${dk}`);
  
  const result = await chrome.storage.local.get(storageKeys);
  
  const series = [];
  
  for (let i = 0; i < dateKeys.length; i++) {
    const dateKey = dateKeys[i];
    const storageKey = storageKeys[i];
    const dayStats = result[storageKey];
    
    let totalSeconds = 0;
    let totalVisits = 0;
    
    if (dayStats && dayStats.sites) {
      for (const [site, data] of Object.entries(dayStats.sites)) {
        if (siteKey && site !== siteKey) continue;
        
        totalSeconds += data.seconds || 0;
        totalVisits += data.visits || 0;
      }
    }
    
    series.push({
      date: dateKey,
      seconds: totalSeconds,
      visits: totalVisits
    });
  }
  
  return series;
}

/**
 * Clear data before a certain date
 * @param {Date|null} before - Clear data before this date (null = all data)
 * @returns {Promise<number>} Number of days cleared
 */
export async function clearData(before = null) {
  const allKeys = await chrome.storage.local.get(null);
  const keysToRemove = [];
  
  for (const key of Object.keys(allKeys)) {
    if (!key.startsWith(STORAGE_KEYS.STATS_PREFIX)) continue;
    
    if (before === null) {
      // Clear all stats
      keysToRemove.push(key);
    } else {
      // Check if date is before cutoff
      const dateKey = key.substring(STORAGE_KEYS.STATS_PREFIX.length);
      const keyDate = new Date(dateKey);
      if (keyDate < before) {
        keysToRemove.push(key);
      }
    }
  }
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
  }
  
  return keysToRemove.length;
}

/**
 * Export data as CSV
 * @param {string} period - Period type
 * @param {string|null} siteKey - Specific site or null for all
 * @returns {Promise<string>} CSV string
 */
export async function exportCSV(period, siteKey = null) {
  const series = await getSeries(period, siteKey);
  
  // CSV header
  let csv = 'date,siteKey,secondsSpent,minutesSpent,visits\n';
  
  // If no specific site, we need to get per-site breakdown
  if (!siteKey) {
    const dateKeys = getDateKeysForPeriod(period);
    const storageKeys = dateKeys.map(dk => `${STORAGE_KEYS.STATS_PREFIX}${dk}`);
    const result = await chrome.storage.local.get(storageKeys);
    
    for (let i = 0; i < dateKeys.length; i++) {
      const dateKey = dateKeys[i];
      const storageKey = storageKeys[i];
      const dayStats = result[storageKey];
      
      if (dayStats && dayStats.sites) {
        for (const [site, data] of Object.entries(dayStats.sites)) {
          const seconds = data.seconds || 0;
          const minutes = Math.round(seconds / 60);
          const visits = data.visits || 0;
          // Use escapeCSV to prevent CSV injection on all fields
          csv += `${escapeCSV(dateKey)},${escapeCSV(site)},${escapeCSV(seconds)},${escapeCSV(minutes)},${escapeCSV(visits)}\n`;
        }
      }
    }
  } else {
    // Single site export
    for (const row of series) {
      const minutes = Math.round(row.seconds / 60);
      // Use escapeCSV to prevent CSV injection on all fields
      csv += `${escapeCSV(row.date)},${escapeCSV(siteKey)},${escapeCSV(row.seconds)},${escapeCSV(minutes)},${escapeCSV(row.visits)}\n`;
    }
  }
  
  return csv;
}

/**
 * Get current session state
 * @returns {Promise<Object|null>} Current session or null
 */
export async function getCurrentSession() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.CURRENT_SESSION);
  return result[STORAGE_KEYS.CURRENT_SESSION] || null;
}

/**
 * Save current session state
 * @param {Object|null} session - Session object or null to clear
 * @returns {Promise<void>}
 */
export async function saveCurrentSession(session) {
  if (session === null) {
    await chrome.storage.local.remove(STORAGE_KEYS.CURRENT_SESSION);
  } else {
    await chrome.storage.local.set({
      [STORAGE_KEYS.CURRENT_SESSION]: session
    });
  }
}

/**
 * Get storage quota information
 * @returns {Promise<Object>} { used, quota, percentUsed }
 */
export async function getStorageInfo() {
  if (chrome.storage.local.getBytesInUse) {
    const used = await chrome.storage.local.getBytesInUse();
    const quota = chrome.storage.local.QUOTA_BYTES || 10485760; // 10MB default
    return {
      used,
      quota,
      percentUsed: (used / quota) * 100
    };
  }
  return { used: 0, quota: 0, percentUsed: 0 };
}
