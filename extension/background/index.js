/**
 * Background service worker entry point
 */

import { MESSAGE_TYPES } from '../lib/constants.js';
import { initTracker, getCurrentTrackingState } from './tracker.js';
import { getSummary, getSeries, getSettings, updateSettings, exportCSV, clearData } from './storage.js';
import { getRules, addRule, removeRule, updateRule } from './rules.js';
import { checkNotifications } from './notify.js';

// Initialize tracking engine
initTracker();

// Handle extension icon click to open sidebar
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// Check notifications periodically
chrome.alarms.create('checkNotifications', { periodInMinutes: 30 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'checkNotifications') {
    checkNotifications();
  }
});

// Handle messages from UI
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message).then(sendResponse).catch(error => {
    sendResponse({ type: MESSAGE_TYPES.ERROR, error: error.message });
  });
  return true; // Keep channel open for async response
});

async function handleMessage(message) {
  switch (message.type) {
  case MESSAGE_TYPES.GET_SUMMARY: {
    const summary = await getSummary(message.payload.period, message.payload.siteKey, message.payload.date);
    return { type: MESSAGE_TYPES.SUMMARY_DATA, payload: summary };
  }
    
  case MESSAGE_TYPES.GET_SERIES: {
    const series = await getSeries(message.payload.period, message.payload.siteKey);
    return { type: MESSAGE_TYPES.SERIES_DATA, payload: series };
  }
    
  case MESSAGE_TYPES.GET_CURRENT_SESSION: {
    const session = getCurrentTrackingState();
    return { type: MESSAGE_TYPES.CURRENT_SESSION_DATA, payload: session };
  }
    
  case MESSAGE_TYPES.GET_RULES: {
    const rules = await getRules();
    return { type: MESSAGE_TYPES.RULES_DATA, payload: rules };
  }
    
  case MESSAGE_TYPES.ADD_RULE: {
    await addRule(message.payload);
    return { type: MESSAGE_TYPES.RULES_DATA, payload: await getRules() };
  }
    
  case MESSAGE_TYPES.REMOVE_RULE:
    await removeRule(message.payload.ruleId);
    return { type: MESSAGE_TYPES.RULES_DATA, payload: await getRules() };
    
  case MESSAGE_TYPES.UPDATE_RULE:
    await updateRule(message.payload.ruleId, message.payload.updates);
    return { type: MESSAGE_TYPES.RULES_DATA, payload: await getRules() };
    
  case MESSAGE_TYPES.GET_SETTINGS: {
    const settings = await getSettings();
    return { type: MESSAGE_TYPES.SETTINGS_DATA, payload: settings };
  }
    
  case MESSAGE_TYPES.UPDATE_SETTINGS:
    await updateSettings(message.payload);
    return { type: MESSAGE_TYPES.SETTINGS_DATA, payload: message.payload };
    
  case MESSAGE_TYPES.CLEAR_DATA: {
    const count = await clearData(message.payload.before);
    return { type: MESSAGE_TYPES.SUMMARY_DATA, payload: { cleared: count } };
  }
    
  case MESSAGE_TYPES.EXPORT_CSV: {
    const csv = await exportCSV(message.payload.period, message.payload.siteKey);
    return { type: MESSAGE_TYPES.SUMMARY_DATA, payload: { csv } };
  }
    
  default:
    throw new Error(`Unknown message type: ${message.type}`);
  }
}
