/**
 * Constants and configuration values for the Time Tracker extension
 */

// Time tracking configuration
export const TRACKING_CONFIG = {
  HEARTBEAT_INTERVAL_MS: 1000, // 1 second heartbeat
  FLUSH_INTERVAL_MS: 30000, // Flush to storage every 30 seconds
  VISIT_GAP_THRESHOLD_SECONDS: 30, // Gap to distinguish separate visits
  IDLE_THRESHOLD_SECONDS: 60, // Seconds before user is considered idle
};

// Storage keys
export const STORAGE_KEYS = {
  SETTINGS: 'settings',
  TRACKED_RULES: 'trackedRules',
  STATS_PREFIX: 'stats:', // Prefix for daily stats (stats:YYYY-MM-DD)
  CURRENT_SESSION: 'currentSession',
  LAST_NOTIFICATION: 'lastNotification',
};

// Time periods
export const TIME_PERIODS = {
  DAY: 'day',
  WEEK: 'week',
  MONTH: 'month',
  QUARTER: 'quarter',
  YEAR: 'year',
};

// Message types for communication between UI and background
export const MESSAGE_TYPES = {
  // UI -> Background
  GET_SUMMARY: 'GET_SUMMARY',
  GET_SERIES: 'GET_SERIES',
  GET_CURRENT_SESSION: 'GET_CURRENT_SESSION',
  ADD_RULE: 'ADD_RULE',
  REMOVE_RULE: 'REMOVE_RULE',
  UPDATE_RULE: 'UPDATE_RULE',
  GET_RULES: 'GET_RULES',
  UPDATE_SETTINGS: 'UPDATE_SETTINGS',
  GET_SETTINGS: 'GET_SETTINGS',
  CLEAR_DATA: 'CLEAR_DATA',
  EXPORT_CSV: 'EXPORT_CSV',
  
  // Background -> UI
  TRACKING_UPDATE: 'TRACKING_UPDATE',
  SUMMARY_DATA: 'SUMMARY_DATA',
  SERIES_DATA: 'SERIES_DATA',
  CURRENT_SESSION_DATA: 'CURRENT_SESSION_DATA',
  RULES_DATA: 'RULES_DATA',
  SETTINGS_DATA: 'SETTINGS_DATA',
  ERROR: 'ERROR',
};

// Rule types
export const RULE_TYPES = {
  DOMAIN: 'domain',
  EXACT_HOST: 'host',
  URL_PREFIX: 'prefix',
  REGEX: 'regex', // Advanced, optional
};

// Default settings
export const DEFAULT_SETTINGS = {
  visitGapSeconds: 30,
  heartbeatMs: 1000,
  notifications: {
    enabled: false,
    thresholds: {}, // { 'example.com': 120 } - minutes
    globalLimit: null, // minutes
  },
  privacy: {
    allowExportOnly: true,
  },
};

// Date/time utilities constants
export const MS_PER_SECOND = 1000;
export const SECONDS_PER_MINUTE = 60;
export const MINUTES_PER_HOUR = 60;
export const HOURS_PER_DAY = 24;
export const DAYS_PER_WEEK = 7;

// Error messages
export const ERROR_MESSAGES = {
  STORAGE_QUOTA_EXCEEDED: 'Storage quota exceeded. Please clear old data.',
  INVALID_RULE: 'Invalid rule format',
  DUPLICATE_RULE: 'Rule already exists',
  INVALID_PERIOD: 'Invalid time period',
  EXPORT_FAILED: 'Failed to export data',
};
