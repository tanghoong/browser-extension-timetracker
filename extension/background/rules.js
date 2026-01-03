/**
 * Rules module for URL matching and rule management
 */

import { RULE_TYPES, STORAGE_KEYS, ERROR_MESSAGES } from '../lib/constants.js';
import { normalizeUrl, getETLDPlusOne, generateId } from '../lib/utils.js';

/**
 * Get all tracking rules
 * @returns {Promise<Array>} Array of rule objects
 */
export async function getRules() {
  const result = await chrome.storage.local.get(STORAGE_KEYS.TRACKED_RULES);
  return result[STORAGE_KEYS.TRACKED_RULES] || [];
}

/**
 * Add a new tracking rule
 * @param {Object} rule - Rule object { type, value, includeSubdomains, enabled }
 * @returns {Promise<Object>} Created rule with ID
 */
export async function addRule(rule) {
  const rules = await getRules();
  
  // Validate rule
  if (!rule.type || !rule.value) {
    throw new Error(ERROR_MESSAGES.INVALID_RULE);
  }
  
  // Check for duplicates
  const duplicate = rules.find(r => 
    r.type === rule.type && 
    r.value.toLowerCase() === rule.value.toLowerCase()
  );
  
  if (duplicate) {
    throw new Error(ERROR_MESSAGES.DUPLICATE_RULE);
  }
  
  // Create new rule
  const newRule = {
    id: generateId(),
    type: rule.type,
    value: rule.value.toLowerCase(),
    includeSubdomains: rule.includeSubdomains !== false,
    enabled: rule.enabled !== false,
    createdAt: Date.now()
  };
  
  rules.push(newRule);
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.TRACKED_RULES]: rules
  });
  
  return newRule;
}

/**
 * Remove a tracking rule
 * @param {string} ruleId - Rule ID to remove
 * @returns {Promise<boolean>} True if removed
 */
export async function removeRule(ruleId) {
  const rules = await getRules();
  const index = rules.findIndex(r => r.id === ruleId);
  
  if (index === -1) {
    return false;
  }
  
  rules.splice(index, 1);
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.TRACKED_RULES]: rules
  });
  
  return true;
}

/**
 * Update a tracking rule
 * @param {string} ruleId - Rule ID to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated rule or null
 */
export async function updateRule(ruleId, updates) {
  const rules = await getRules();
  const rule = rules.find(r => r.id === ruleId);
  
  if (!rule) {
    return null;
  }
  
  // Apply updates
  if (updates.value !== undefined) {
    rule.value = updates.value.toLowerCase();
  }
  if (updates.type !== undefined) {
    rule.type = updates.type;
  }
  if (updates.includeSubdomains !== undefined) {
    rule.includeSubdomains = updates.includeSubdomains;
  }
  if (updates.enabled !== undefined) {
    rule.enabled = updates.enabled;
  }
  
  rule.updatedAt = Date.now();
  
  await chrome.storage.local.set({
    [STORAGE_KEYS.TRACKED_RULES]: rules
  });
  
  return rule;
}

/**
 * Match a URL against all rules
 * @param {string} url - URL to match
 * @param {Array} rules - Array of rules (optional, will fetch if not provided)
 * @returns {Promise<Object|null>} { rule, siteKey } or null if no match
 */
export async function matchURL(url, rules = null) {
  if (!rules) {
    rules = await getRules();
  }
  
  // Only check enabled rules
  const enabledRules = rules.filter(r => r.enabled);
  
  if (enabledRules.length === 0) {
    return null;
  }
  
  let urlObj;
  try {
    urlObj = new URL(url);
  } catch (e) {
    return null;
  }
  
  const hostname = normalizeUrl(url);
  
  for (const rule of enabledRules) {
    let matched = false;
    let siteKey = null;
    
    switch (rule.type) {
      case RULE_TYPES.DOMAIN: {
        const ruleDomain = rule.value.toLowerCase();
        const etld = getETLDPlusOne(hostname);
        
        if (rule.includeSubdomains) {
          // Match domain and all subdomains
          matched = hostname === ruleDomain || 
                   hostname.endsWith(`.${ruleDomain}`) ||
                   etld === ruleDomain;
        } else {
          // Exact domain match only
          matched = hostname === ruleDomain;
        }
        
        if (matched) {
          siteKey = ruleDomain;
        }
        break;
      }
      
      case RULE_TYPES.EXACT_HOST: {
        const ruleHost = rule.value.toLowerCase();
        matched = hostname === ruleHost;
        if (matched) {
          siteKey = ruleHost;
        }
        break;
      }
      
      case RULE_TYPES.URL_PREFIX: {
        const rulePrefix = rule.value.toLowerCase();
        matched = url.toLowerCase().startsWith(rulePrefix);
        if (matched) {
          siteKey = hostname;
        }
        break;
      }
      
      case RULE_TYPES.REGEX: {
        try {
          const regex = new RegExp(rule.value, 'i');
          matched = regex.test(url);
          if (matched) {
            siteKey = hostname;
          }
        } catch (e) {
          // Invalid regex, skip
          console.error('Invalid regex in rule:', rule.id, e);
        }
        break;
      }
    }
    
    if (matched) {
      return { rule, siteKey };
    }
  }
  
  return null;
}

/**
 * Validate a rule before adding/updating
 * @param {Object} rule - Rule to validate
 * @returns {Object} { valid: boolean, errors: string[] }
 */
export function validateRule(rule) {
  const errors = [];
  
  if (!rule.type) {
    errors.push('Rule type is required');
  }
  
  if (!rule.value || typeof rule.value !== 'string') {
    errors.push('Rule value must be a non-empty string');
  }
  
  if (rule.type && !Object.values(RULE_TYPES).includes(rule.type)) {
    errors.push(`Invalid rule type: ${rule.type}`);
  }
  
  // Type-specific validation
  if (rule.type === RULE_TYPES.REGEX && rule.value) {
    try {
      new RegExp(rule.value);
    } catch (e) {
      errors.push('Invalid regular expression');
    }
  }
  
  if (rule.type === RULE_TYPES.DOMAIN || rule.type === RULE_TYPES.EXACT_HOST) {
    // Basic hostname validation
    if (!/^[a-z0-9.-]+$/i.test(rule.value)) {
      errors.push('Invalid domain/hostname format');
    }
  }
  
  if (rule.type === RULE_TYPES.URL_PREFIX) {
    try {
      new URL(rule.value);
    } catch (e) {
      errors.push('Invalid URL prefix');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
