/**
 * Utility functions for the Time Tracker extension
 */

import {
  SECONDS_PER_MINUTE,
  MINUTES_PER_HOUR,
} from './constants.js';

/**
 * Format seconds into a human-readable time string
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string (e.g., "2h 30m 15s")
 */
export function formatTime(seconds) {
  if (!seconds || seconds < 0) return '0s';
  
  const hours = Math.floor(seconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
  const minutes = Math.floor((seconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
  const secs = Math.floor(seconds % SECONDS_PER_MINUTE);
  
  const parts = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  
  return parts.join(' ');
}

/**
 * Format seconds into HH:MM:SS format
 * @param {number} seconds - Total seconds
 * @returns {string} Formatted time string (e.g., "02:30:15")
 */
export function formatTimeHMS(seconds) {
  if (!seconds || seconds < 0) return '00:00:00';
  
  const hours = Math.floor(seconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR));
  const minutes = Math.floor((seconds % (SECONDS_PER_MINUTE * MINUTES_PER_HOUR)) / SECONDS_PER_MINUTE);
  const secs = Math.floor(seconds % SECONDS_PER_MINUTE);
  
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

/**
 * Get date string in YYYY-MM-DD format
 * @param {Date|number} date - Date object or timestamp
 * @returns {string} Date string
 */
export function getDateKey(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get start of day timestamp
 * @param {Date|number} date - Date object or timestamp
 * @returns {number} Timestamp at start of day (00:00:00)
 */
export function getStartOfDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/**
 * Get end of day timestamp
 * @param {Date|number} date - Date object or timestamp
 * @returns {number} Timestamp at end of day (23:59:59.999)
 */
export function getEndOfDay(date = new Date()) {
  const d = date instanceof Date ? date : new Date(date);
  d.setHours(23, 59, 59, 999);
  return d.getTime();
}

/**
 * Get array of date keys for a given period
 * @param {string} period - Period type (day, week, month, quarter, year)
 * @param {Date} endDate - End date (defaults to today)
 * @returns {string[]} Array of date keys
 */
export function getDateKeysForPeriod(period, endDate = new Date()) {
  const keys = [];
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  
  let start = new Date(end);
  
  switch (period) {
  case 'day':
    keys.push(getDateKey(end));
    break;
      
  case 'week':
    start.setDate(end.getDate() - 6);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      keys.push(getDateKey(new Date(d)));
    }
    break;
      
  case 'month':
    start.setDate(1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      keys.push(getDateKey(new Date(d)));
    }
    break;
      
  case 'quarter': {
    const quarterStart = Math.floor(end.getMonth() / 3) * 3;
    start.setMonth(quarterStart, 1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      keys.push(getDateKey(new Date(d)));
    }
    break;
  }
      
  case 'year':
    start.setMonth(0, 1);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      keys.push(getDateKey(new Date(d)));
    }
    break;
  }
  
  return keys;
}

/**
 * Normalize URL for matching
 * @param {string} url - URL to normalize
 * @returns {string} Normalized URL
 */
export function normalizeUrl(url) {
  try {
    const urlObj = new URL(url);
    let host = urlObj.hostname.toLowerCase();
    
    // Remove www. prefix
    if (host.startsWith('www.')) {
      host = host.substring(4);
    }
    
    return host;
  } catch (e) {
    return url.toLowerCase();
  }
}

/**
 * Extract eTLD+1 from hostname
 * @param {string} hostname - Hostname to process
 * @returns {string} eTLD+1 domain
 */
export function getETLDPlusOne(hostname) {
  const parts = hostname.split('.');
  if (parts.length <= 2) return hostname;
  
  // Simple implementation - just get last two parts
  // For production, consider using a proper public suffix list
  return parts.slice(-2).join('.');
}

/**
 * Generate a unique ID
 * @returns {string} Unique ID
 */
export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Check if browser supports a specific API
 * @param {string} api - API name
 * @returns {boolean} True if supported
 */
export function supportsAPI(api) {
  return typeof browser !== 'undefined' && api in browser ||
         typeof chrome !== 'undefined' && api in chrome;
}
