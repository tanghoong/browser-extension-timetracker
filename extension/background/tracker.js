/**
 * Main tracking engine for Time Tracker extension
 * Handles tab/window/idle events and time accumulation
 */

import { TRACKING_CONFIG, MESSAGE_TYPES } from '../lib/constants.js';
import { saveSession, getCurrentSession, saveCurrentSession, getSettings } from './storage.js';
import { initMessageHandler } from './messageHandler.js';

// Current session state
let currentSession = null;
let heartbeatTimer = null;
let pendingFlush = { seconds: 0, visits: 0 };
let lastFlushTime = Date.now();

/**
 * Initialize the tracking engine
 */
export async function initTracker() {
  console.log('Time Tracker: Initializing tracking engine');
  
  // Initialize message handler for UI communication
  initMessageHandler();
  
  // Restore session state if exists
  currentSession = await getCurrentSession();
  
  if (currentSession) {
    console.log('Time Tracker: Restored session', currentSession);
    startHeartbeat();
  }
  
  // Set up event listeners
  setupEventListeners();
  
  // Check current active tab
  checkActiveTab();
  
  console.log('Time Tracker: Initialization complete');
}

/**
 * Set up browser event listeners
 */
function setupEventListeners() {
  // Tab activated (user switches tabs)
  chrome.tabs.onActivated.addListener(handleTabActivated);
  
  // Tab updated (URL change, page load, etc.)
  chrome.tabs.onUpdated.addListener(handleTabUpdated);
  
  // Window focus changed
  chrome.windows.onFocusChanged.addListener(handleWindowFocusChanged);
  
  // Idle state changed
  if (chrome.idle) {
    chrome.idle.onStateChanged.addListener(handleIdleStateChanged);
  }
  
  // Alarm for periodic flush
  chrome.alarms.create('flush', { periodInMinutes: 0.5 }); // Every 30 seconds
  chrome.alarms.onAlarm.addListener(handleAlarm);
}

/**
 * Handle tab activation
 */
async function handleTabActivated(activeInfo) {
  console.log('Time Tracker: Tab activated', activeInfo.tabId);
  
  const tab = await chrome.tabs.get(activeInfo.tabId);
  await updateTrackingForTab(tab);
}

/**
 * Handle tab updates
 */
async function handleTabUpdated(tabId, changeInfo, tab) {
  // Only care about URL changes or loading complete
  if (!changeInfo.url && changeInfo.status !== 'complete') {
    return;
  }
  
  // Check if this is the active tab
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (activeTab && activeTab.id === tabId) {
    console.log('Time Tracker: Active tab updated', tabId);
    await updateTrackingForTab(tab);
  }
}

/**
 * Handle window focus changes
 */
async function handleWindowFocusChanged(windowId) {
  console.log('Time Tracker: Window focus changed', windowId);
  
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    // No window focused, stop tracking
    await stopCurrentSession();
  } else {
    // Check active tab in focused window
    await checkActiveTab();
  }
}

/**
 * Handle idle state changes
 */
async function handleIdleStateChanged(newState) {
  console.log('Time Tracker: Idle state changed', newState);
  
  if (newState === 'idle' || newState === 'locked') {
    // User is idle, stop tracking
    await stopCurrentSession();
  } else if (newState === 'active') {
    // User is active again, check current tab
    await checkActiveTab();
  }
}

/**
 * Handle alarms
 */
function handleAlarm(alarm) {
  if (alarm.name === 'flush') {
    flushPendingData();
  }
}

/**
 * Check current active tab and start/stop tracking
 */
async function checkActiveTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (tab) {
      await updateTrackingForTab(tab);
    } else {
      await stopCurrentSession();
    }
  } catch (error) {
    console.error('Time Tracker: Error checking active tab', error);
  }
}

/**
 * Update tracking for a specific tab
 */
async function updateTrackingForTab(tab) {
  if (!tab || !tab.url) {
    await stopCurrentSession();
    return;
  }
  
  // Skip special URLs
  if (tab.url.startsWith('chrome://') || 
      tab.url.startsWith('about:') ||
      tab.url.startsWith('edge://') ||
      tab.url.startsWith('chrome-extension://')) {
    await stopCurrentSession();
    return;
  }
  
  // Extract domain from URL (auto-track everything)
  let siteKey;
  try {
    const urlObj = new URL(tab.url);
    siteKey = urlObj.hostname.replace(/^www\./, '');
  } catch (e) {
    await stopCurrentSession();
    return;
  }
  
  if (!siteKey) {
    await stopCurrentSession();
    return;
  }
  
  // Check if we should count this as a new visit
  const shouldCountVisit = await checkVisitThreshold(siteKey);
  
  // Start or update session
  await startSession(tab.id, siteKey, null, shouldCountVisit);
}

/**
 * Check if enough time has passed to count as a new visit
 */
async function checkVisitThreshold(siteKey) {
  if (!currentSession) {
    return true; // First visit
  }
  
  if (currentSession.siteKey !== siteKey) {
    return true; // Different site
  }
  
  const settings = await getSettings();
  const thresholdMs = (settings.visitGapSeconds || 30) * 1000;
  const timeSinceLastTick = Date.now() - currentSession.lastTickTs;
  
  return timeSinceLastTick > thresholdMs;
}

/**
 * Start or update a tracking session
 */
async function startSession(tabId, siteKey, rule, countVisit = false) {
  const now = Date.now();
  
  // If same session, just update timestamp
  if (currentSession && 
      currentSession.tabId === tabId && 
      currentSession.siteKey === siteKey) {
    currentSession.lastTickTs = now;
    return;
  }
  
  // Stop previous session if exists
  if (currentSession) {
    await stopCurrentSession();
  }
  
  // Start new session
  currentSession = {
    tabId,
    siteKey,
    ruleId: rule?.id || null,
    startTs: now,
    lastTickTs: now,
    isCounting: true,
    accumulatedSeconds: 0
  };
  
  // Count visit if applicable
  if (countVisit) {
    pendingFlush.visits += 1;
  }
  
  console.log('Time Tracker: Started session', siteKey);
  
  // Save session state
  await saveCurrentSession(currentSession);
  
  // Start heartbeat if not running
  startHeartbeat();
  
  // Notify UI
  notifyUI();
}

/**
 * Stop current tracking session
 */
async function stopCurrentSession() {
  if (!currentSession) {
    return;
  }
  
  console.log('Time Tracker: Stopping session', currentSession.siteKey);
  
  // Calculate final elapsed time
  const elapsed = Math.floor((Date.now() - currentSession.lastTickTs) / 1000);
  if (elapsed > 0) {
    currentSession.accumulatedSeconds += elapsed;
    pendingFlush.seconds += elapsed;
  }
  
  // Flush immediately
  await flushPendingData();
  
  // Clear session
  currentSession = null;
  await saveCurrentSession(null);
  
  // Stop heartbeat
  stopHeartbeat();
  
  // Notify UI
  notifyUI();
}

/**
 * Start heartbeat timer
 */
function startHeartbeat() {
  if (heartbeatTimer) {
    return; // Already running
  }
  
  heartbeatTimer = setInterval(onHeartbeat, TRACKING_CONFIG.HEARTBEAT_INTERVAL_MS);
  console.log('Time Tracker: Heartbeat started');
}

/**
 * Stop heartbeat timer
 */
function stopHeartbeat() {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = null;
    console.log('Time Tracker: Heartbeat stopped');
  }
}

/**
 * Heartbeat tick - accumulate time
 */
function onHeartbeat() {
  if (!currentSession || !currentSession.isCounting) {
    return;
  }
  
  const now = Date.now();
  const elapsedMs = now - currentSession.lastTickTs;
  const elapsedSeconds = Math.floor(elapsedMs / 1000);
  
  if (elapsedSeconds > 0) {
    currentSession.accumulatedSeconds += elapsedSeconds;
    currentSession.lastTickTs = now;
    pendingFlush.seconds += elapsedSeconds;
  }
  
  // Check if we need to flush
  const timeSinceFlush = now - lastFlushTime;
  if (timeSinceFlush >= TRACKING_CONFIG.FLUSH_INTERVAL_MS) {
    flushPendingData();
  }
  
  // Notify UI of update
  notifyUI();
}

/**
 * Flush pending data to storage
 */
async function flushPendingData() {
  if (!currentSession || (pendingFlush.seconds === 0 && pendingFlush.visits === 0)) {
    return;
  }
  
  try {
    const siteKey = currentSession.siteKey;
    const seconds = pendingFlush.seconds;
    const visits = pendingFlush.visits;
    
    await saveSession(
      siteKey,
      seconds,
      visits
    );
    
    console.log(`Time Tracker: Flushed ${seconds}s, ${visits} visits for ${siteKey}`);
    
    // Reset pending data
    pendingFlush = { seconds: 0, visits: 0 };
    lastFlushTime = Date.now();
  } catch (error) {
    console.error('Time Tracker: Error flushing data', error);
  }
}

/**
 * Notify UI of tracking updates
 */
function notifyUI() {
  // Send message to all open extension pages
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.TRACKING_UPDATE,
    payload: currentSession ? {
      siteKey: currentSession.siteKey,
      seconds: currentSession.accumulatedSeconds + pendingFlush.seconds,
      visits: pendingFlush.visits,
      isActive: true
    } : {
      isActive: false
    }
  }).catch(() => {
    // No listeners, ignore
  });
}

/**
 * Get current tracking state
 */
export function getCurrentTrackingState() {
  if (!currentSession) {
    return { isActive: false };
  }
  
  return {
    isActive: true,
    siteKey: currentSession.siteKey,
    seconds: currentSession.accumulatedSeconds + pendingFlush.seconds,
    visits: pendingFlush.visits,
    startTime: currentSession.startTs
  };
}

// Initialize on load
initTracker();
