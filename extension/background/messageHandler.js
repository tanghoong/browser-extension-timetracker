import { MESSAGE_TYPES } from '../lib/constants.js';
import * as storage from './storage.js';
import * as rules from './rules.js';

export function initMessageHandler() {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    handleMessage(message, sender).then(sendResponse);
    return true; // Async response
  });
}

async function handleMessage(message, sender) {
  const { type, payload = {} } = message;

  try {
    switch (type) {
    case MESSAGE_TYPES.GET_SUMMARY:
      return await getSummary(payload);
      
    case MESSAGE_TYPES.GET_SERIES:
      return await getSeries(payload);
      
    case MESSAGE_TYPES.GET_CURRENT_SESSION:
      return await getCurrentSession();
      
    case MESSAGE_TYPES.EXPORT_CSV:
      return await exportCSV(payload);
      
    case MESSAGE_TYPES.GET_RULES:
      return await getRules();
      
    case MESSAGE_TYPES.ADD_RULE:
      return await addRule(payload);
      
    case MESSAGE_TYPES.UPDATE_RULE:
      return await updateRule(payload);
      
    case MESSAGE_TYPES.REMOVE_RULE:
      return await removeRule(payload);
      
    case MESSAGE_TYPES.GET_SETTINGS:
      return await getSettings();
      
    case MESSAGE_TYPES.UPDATE_SETTINGS:
      return await updateSettings(payload);
      
    case MESSAGE_TYPES.CLEAR_DATA:
      return await clearData(payload);
      
    default:
      return { error: 'Unknown message type' };
    }
  } catch (error) {
    console.error('Message handler error:', error);
    return { error: error.message };
  }
}

async function getSummary({ period, siteKey }) {
  const summary = await storage.getSummary(period, siteKey);
  return { summary };
}

async function getSeries({ period, siteKey }) {
  const series = await storage.getSeries(period, siteKey);
  return { series };
}

async function getCurrentSession() {
  const state = await storage.getCurrentSession();
  return { state };
}

async function exportCSV({ period, siteKey }) {
  const csv = await storage.exportCSV(period, siteKey);
  return { csv };
}

async function getRules() {
  const rulesList = await rules.getRules();
  return { rules: rulesList };
}

async function addRule({ type, value, includeSubdomains }) {
  const result = await rules.addRule({ type, value, includeSubdomains });
  return result;
}

async function updateRule({ ruleId, updates }) {
  const result = await rules.updateRule(ruleId, updates);
  return result;
}

async function removeRule({ ruleId }) {
  const result = await rules.removeRule(ruleId);
  return result;
}

async function getSettings() {
  const result = await chrome.storage.local.get(['settings']);
  return { settings: result.settings || {} };
}

async function updateSettings(updates) {
  const { settings } = await chrome.storage.local.get(['settings']);
  const newSettings = { ...settings, ...updates };
  await chrome.storage.local.set({ settings: newSettings });
  return { success: true };
}

async function clearData({ before }) {
  await storage.clearData(before);
  return { success: true };
}
