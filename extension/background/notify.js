/**
 * Notification module for Time Tracker extension
 */

import { STORAGE_KEYS } from '../lib/constants.js';
import { getSettings } from './storage.js';
import { getSummary } from './storage.js';
import { getDateKey } from '../lib/utils.js';

/**
 * Check and trigger notifications if thresholds exceeded
 */
export async function checkNotifications() {
  const settings = await getSettings();
  
  if (!settings.notifications || !settings.notifications.enabled) {
    return;
  }
  
  const today = getDateKey();
  const lastNotified = await getLastNotificationDate();
  
  // Only notify once per day
  if (lastNotified === today) {
    return;
  }
  
  // Get today's summary
  const summary = await getSummary('day');
  
  // Check per-site thresholds
  if (settings.notifications.thresholds) {
    for (const [siteKey, limitMinutes] of Object.entries(settings.notifications.thresholds)) {
      if (summary.sites[siteKey]) {
        const minutes = Math.floor(summary.sites[siteKey].seconds / 60);
        
        if (minutes >= limitMinutes) {
          await showNotification(
            `Time Limit Reached: ${siteKey}`,
            `You've spent ${minutes} minutes on ${siteKey} today (limit: ${limitMinutes} minutes).`
          );
          await setLastNotificationDate(today);
          return; // Only one notification per day
        }
      }
    }
  }
  
  // Check global threshold
  if (settings.notifications.globalLimit) {
    let totalMinutes = 0;
    for (const site of Object.values(summary.sites)) {
      totalMinutes += Math.floor(site.seconds / 60);
    }
    
    if (totalMinutes >= settings.notifications.globalLimit) {
      await showNotification(
        'Daily Time Limit Reached',
        `You've spent ${totalMinutes} minutes on tracked sites today (limit: ${settings.notifications.globalLimit} minutes).`
      );
      await setLastNotificationDate(today);
    }
  }
}

/**
 * Show a browser notification
 */
async function showNotification(title, message) {
  await chrome.notifications.create({
    type: 'basic',
    iconUrl: '../assets/icons/icon-128.png',
    title,
    message,
    priority: 1
  });
}

/**
 * Get the last notification date
 */
async function getLastNotificationDate() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.LAST_NOTIFICATION);
  return result[STORAGE_KEYS.LAST_NOTIFICATION] || null;
}

/**
 * Set the last notification date
 */
async function setLastNotificationDate(dateKey) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.LAST_NOTIFICATION]: dateKey
  });
}
