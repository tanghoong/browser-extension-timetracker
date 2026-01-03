# Time Tracker Browser Extension - Product Requirements Document (PRD)

**Version:** 1.0  
**Last Updated:** January 4, 2026  
**Status:** Ready for Development

## Executive Summary

This document defines the complete product requirements and technical architecture for a privacy-first, cross-browser time tracking extension that monitors time spent and visits on user-specified websites with ≤5% accuracy error.

### Quick Overview

- **Product Type:** Browser Extension (Chrome, Edge, Firefox)
- **Core Value:** Accurate time and visit tracking for personal productivity insights
- **Privacy Stance:** Local-only data storage, no external servers, zero telemetry
- **Target Users:** Individuals seeking to understand and optimize their web browsing habits
- **Development Complexity:** Medium (estimated 4-6 weeks for MVP)
- **Tech Stack:** Vanilla JavaScript, WebExtensions API, browser-polyfill, Chart.js (optional)

---

## 1) Product Scope

### Goal

Track **time spent** and **number of visits** on **user-specified websites** with **≤5% error**, show results for:

* **Daily / Weekly / Monthly / Quarterly / Yearly**
* Real-time updates (seconds and visit count)
* Charts (bar chart)
* CSV export
* Notifications for time-spent alerts
* Privacy-first: **no external sharing** unless user explicitly exports or opts-in

### Supported Browsers

* Chrome (Manifest V3) - Primary target
* Edge (Manifest V3) - Full support
* Firefox (WebExtensions; MV3 support improving—design to work with MV2/MV3 compatible patterns where possible)

Use the standard **WebExtensions API** + `webextension-polyfill` to normalize promises across browsers.

### Out of Scope (MVP)

The following features are explicitly excluded from the initial release:

* Mobile browser support (iOS Safari, Chrome Mobile, Firefox Mobile)
* Cloud synchronization or backup
* Team/organizational features or multi-user accounts
* Integration with external productivity tools (Todoist, Notion, etc.)
* Screenshot or content analysis of visited pages
* Automatic categorization or AI-powered insights
* Browser history import for retroactive tracking
* Operating system-level activity tracking (outside browser)

---

## 2) Key Definitions (Tracking Semantics)

### What counts as “time spent”

Count time only when **all** are true:

1. Tab’s URL matches a **tracked rule**
2. Tab is **active** (selected)
3. Browser window is **focused**
4. User is **not idle** (via `idle` API where available; fallback heuristic otherwise)

Time is accumulated in **1-second ticks** (or 2s/5s heartbeat to reduce overhead, then distribute).

### What counts as a “visit”

A **visit** increments when:

* The active tab transitions from **non-tracked → tracked** OR
* The tracked site changes from one tracked domain/rule to another OR
* A tracked tab becomes active after being inactive for more than a threshold (e.g. **30 seconds**) *(configurable, default 30s)*

This avoids over-counting visits due to refreshes or micro navigation while still reflecting real usage.

### 5% Error Budget Strategy

* Use **event-driven** updates (`tabs.onActivated`, `tabs.onUpdated`, `windows.onFocusChanged`, `idle.onStateChanged`)
* Use a **heartbeat** timer for continuity (e.g. 1000ms or 2000ms)
* Persist small increments frequently (e.g. flush every 10–30 seconds, and on blur/idle/tab switch)
* Track monotonic timestamps (`Date.now()` deltas) to avoid drift

---

## 3) System Architecture

### Components

1. **Background service worker** (Chrome/Edge MV3; Firefox background script)

   * Core tracking engine
   * Storage write/read
   * Notifications scheduling
   * Messaging to UI for real-time updates

2. **Content script (optional/minimal)**

   * Not required for time tracking
   * Only needed if you later want page-level signals (not necessary for MVP)

3. **Dashboard UI** (extension page)

   * Period summary cards (day/week/month/quarter/year)
   * Site selector and filters
   * Bar charts (time + visits)
   * CSV export

4. **Settings UI**

   * Manage tracked sites list
   * Notification thresholds & rules
   * Privacy controls (export-only by default)

5. **Help UI**

   * How tracking works
   * FAQ + troubleshooting + privacy explanation

### Data Flow

* Background detects “active tracked session”
* Every heartbeat/event:

  * Update in-memory counters
  * Send `runtime.sendMessage` to dashboard if open
  * Periodically flush to storage

---

## 4) Tracking Engine Design

### Inputs (Events)

* `tabs.onActivated`
* `tabs.onUpdated` (URL changes)
* `windows.onFocusChanged`
* `idle.onStateChanged` (if available)
* Heartbeat `setInterval`

### State Machine (Single Active Session)

Maintain one “current session” at a time:

* `current = { tabId, ruleId, canonicalSiteKey, startTs, lastTickTs, isCounting }`

Transitions:

* If active tab changes or URL changes or focus/idle changes:

  * **Close** previous session: add elapsed time
  * **Open** new session if qualifies

### Canonical URL Matching

Users specify websites to track; support:

* **Domain rule**: `example.com` (matches all subdomains optionally)
* **Exact host**: `app.example.com`
* **URL prefix**: `https://example.com/docs`
* **Regex** (advanced, optional toggle)

Normalize:

* Lowercase host
* Strip `www.` optionally
* Decide tracked “site key” as:

  * default: eTLD+1 (example.com) OR exact host depending on rule type

### Idle Detection Fallback

If `idle` API missing/unreliable:

* Use focus + tab active only
* Optional: infer idle if no focus events for long time (less accurate)
* Still keep within 5% by relying on focus/tab events + heartbeat

---

## 5) Storage Model (Fast Aggregations)

Use `storage.local` (or `storage.sync` optionally for settings only; keep tracking data local to protect privacy and quota limits).

### Core Principle

Store time in **daily buckets**, then aggregate to week/month/quarter/year on demand.

#### Schema

* `settings`:

  * `trackedRules: Rule[]`
  * `visitGapSeconds` (default 30)
  * `heartbeatMs` (default 1000–2000)
  * `notifications: { enabled, thresholdsBySiteKey, dailyLimitMinutes, ... }`
  * `privacy: { allowExportOnly: true }`

* `statsByDay` (partition keys):

  * Key: `stats:YYYY-MM-DD`
  * Value:

    ```json
    {
      "sites": {
        "example.com": { "seconds": 1234, "visits": 7 },
        "docs.example.com": { "seconds": 222, "visits": 2 }
      },
      "updatedAt": 1730000000000
    }
    ```

* Optional index for faster listing:

  * `daysIndex: string[]` of available days (or derive)

### Why daily buckets

* Easy and cheap aggregation:

  * Week = sum last 7 daily keys
  * Month = sum all days in month
  * Quarter = sum 3 months
  * Year = sum 12 months

### Write Strategy (Performance)

* Keep in-memory `pendingDeltas` for current day
* Flush every N seconds or on session close
* Use batched writes to `storage.local`

---

## 6) Dashboard UX Requirements

### Dashboard Layout

1. **Top Summary Cards**

   * Today: total time + visits
   * This Week
   * This Month
   * This Quarter
   * This Year

2. **Site Filter**

   * Dropdown: “All tracked sites” + specific site keys
   * Optional “Top N sites” sort

3. **Period Selector**

   * Day / Week / Month / Quarter / Year
   * For selected period, show bar chart:

     * X-axis: time slices (hours for day; days for week/month; weeks for quarter/year; months for year)
     * Two series toggle: **Time** and **Visits**

4. **Real-Time Panel**

   * “Currently tracking: site + timer running”
   * Live seconds and current visit count changes

5. **Export CSV Button**

   * Export current filtered period and site selection

### Charting Implementation

* No heavy frameworks required.
* Options:

  * Lightweight chart library (e.g., Chart.js) *(acceptable; moderate weight)*
  * Or custom canvas/SVG bars (fast, minimal)
* Ensure smoothness: update chart at most every 1–2 seconds when dashboard visible.

---

## 7) Settings Page Requirements

### Tracked Sites Management

* Add rule:

  * Type: Domain / Exact Host / URL Prefix / Regex (optional advanced)
  * Example input + validation
  * Toggle: include subdomains
* List rules with:

  * Enable/disable
  * Edit
  * Remove

### Notification Preferences

* Enable/disable notifications
* Per-site threshold:

  * “Notify me when I spend X minutes today on example.com”
* Global threshold:

  * “Notify me when total tracked time today exceeds X minutes”
* Notification behavior:

  * Once per day per threshold (avoid spam)
  * Reset at local midnight

### Privacy Controls

* Clear data:

  * Clear today / last 7 days / all
* Export only (default):

  * No network permission
  * No analytics
* Optional future toggle: encrypted cloud sync (out of scope for MVP)

---

## 8) Help Section Contents (Minimum)

### How it works

* Counts time only when tab is active, window focused, not idle
* Visits counted on entry to tracked site or after inactivity gap
* Data stored locally

### FAQs

* “Why is time lower than expected?” (idle/focus rules)
* “Does it track incognito?” (off by default; optional permission)
* “Does it send data anywhere?” (no)
* “How to export?” (CSV steps)
* “How to add a site?” (examples)

---

## 9) Permissions (Minimal & Privacy-first)

Chrome/Edge (manifest v3):

* `storage`
* `tabs` *(or `activeTab` + `tabs` for URL access; you likely need `tabs` for URL tracking)*
* `notifications` (optional if feature enabled)
* `idle` (optional; improves accuracy)
* Host permissions: either

  * None (track only active tab URL from `tabs` API), OR
  * Optional host permissions if you later add content scripts (not needed now)

Firefox:

* Similar WebExtensions permissions.

Avoid `webRequest` and other heavy permissions.

---

## 10) Edge Cases & Accuracy Rules

1. **Multiple windows**

   * Count only focused window’s active tab.
2. **Audio/video in background tab**

   * Do not count unless tab is active (privacy + simplicity).
3. **System sleep / browser suspended**

   * On resume, close session using lastTickTs; don’t count sleep time.
4. **Clock changes**

   * Use deltas between ticks; still store by local day key.
5. **Midnight crossover**

   * Split time between days:

     * If session spans midnight, allocate seconds to both day buckets.
6. **Rapid tab switching**

   * Visits should not explode:

     * Use `visitGapSeconds` and “non-tracked → tracked” logic.

---

## 11) CSV Export Spec

### Export Columns

* `date` (YYYY-MM-DD)
* `siteKey`
* `secondsSpent`
* `minutesSpent` (rounded)
* `visits`

Optional:

* `periodType` / `periodStart` / `periodEnd`

### Export Modes

* “Selected Period Summary” (aggregated totals per site)
* “Daily Breakdown” (per day per site rows)

Generate CSV locally, then use `downloads` API or create a blob download in the UI.

---

## 12) Suggested Project Structure

```
extension/
  manifest.json
  background/
    tracker.js
    storage.js
    rules.js
    notify.js
  ui/
    dashboard.html
    dashboard.js
    dashboard.css
    settings.html
    settings.js
    help.html
    help.js
  assets/
    icon-*.png
  vendor/
    browser-polyfill.js
```

---

## 13) MVP Delivery Checklist

### Must-have (MVP)

* Track time + visits for user-selected sites
* Daily buckets in storage
* Dashboard: day/week/month/quarter/year totals
* Period chart (time + visits)
* CSV export
* Settings: add/remove sites, notification thresholds
* Help section
* Local-only data storage

### Nice-to-have (Phase 2)

* Tagging sites into categories (Work / Personal / Learning)
* Focus mode goals (“Spend 2h on learning this week”)
* Multi-device sync (opt-in, encrypted)
* Advanced rules (regex UI improvements)

---

## 14) Validation & Testing Plan

### Unit Tests

* URL matching and canonicalization
* Visit counting logic (gap threshold)
* Day rollover splitting
* Aggregation correctness for week/month/quarter/year

### Integration Tests

* Tab switching sequences
* Window focus changes
* Idle state transitions
* Browser restart persistence

### Performance Tests

* Ensure background heartbeat minimal (1–2s)
* Storage flush batching
* Dashboard updates only when open

### Accuracy Tests (≤5%)

* Compare against controlled stopwatch sessions:

  * 10–30 min runs with known focus/idle conditions
  * Ensure delta stays within 5%

---

If you want the engineering team to start immediately, the next step is to turn this into:

1. a **manifest + API contract** (message types between UI and background), and
2. a **data aggregation module spec** (functions like `getSummary(period, siteKey)` and `getSeries(period)`).

---

## 15) Enhanced Project Structure

### Extension Source Files

```
extension/
  manifest.json                  # Chrome/Edge MV3 manifest
  manifest.firefox.json          # Firefox compatibility manifest (optional)
  background/
    tracker.js                   # Core tracking engine
    storage.js                   # Storage operations and aggregations
    rules.js                     # URL matching and rule management
    notify.js                    # Notification scheduling
  ui/
    dashboard.html
    dashboard.js
    dashboard.css
    settings.html
    settings.js
    settings.css
    help.html
    help.js
    common.css                   # Shared styles
  assets/
    icons/
      icon-16.png
      icon-48.png
      icon-128.png
    images/
      logo.svg
  vendor/
    browser-polyfill.js
    chart.min.js                 # Optional
  lib/
    utils.js                     # Shared utilities
    constants.js
```

### Development Repository Structure

```
project-root/
  extension/                     # Extension source (above)
  docs/
    API.md
    ARCHITECTURE.md
    TESTING.md
  tests/
    unit/
      storage.test.js
      rules.test.js
    integration/
      tracking.test.js
  scripts/
    build.js
    package.js
  .github/
    workflows/ci.yml
    ISSUE_TEMPLATE/
      bug_report.md
      feature_request.md
  README.md
  TASKS.md
  CONTRIBUTING.md
  LICENSE
  CHANGELOG.md
  package.json
```

---

## 16) Development Timeline

### Phase 1: Foundation (Week 1-2)
- Set up project structure
- Implement background tracking engine
- Build storage layer
- Create URL matching system
- Basic event listeners

### Phase 2: Core UI (Week 3-4)
- Dashboard implementation
- Summary cards and charts
- Settings page
- Real-time updates

### Phase 3: Features & Polish (Week 5-6)
- Notifications system
- CSV export
- Help section
- Cross-browser testing
- Performance optimization

### Phase 4: Launch (Week 7)
- Accuracy validation
- Bug fixes
- Store submission prep
- Documentation
- Beta testing

---

## 17) Technical Dependencies

### Required
- webextension-polyfill (v0.10.0+)
- Chart.js (v4.x) or custom implementation

### Development Tools
- Node.js (v18+) optional
- web-ext CLI for Firefox
- ESLint, Prettier

### Browser Requirements
- Chrome 88+ (MV3)
- Edge 88+ (MV3)
- Firefox 109+

---

## 18) Success Metrics

### Accuracy
- Time tracking: ≥95% accuracy (≤5% error)
- Visit counting: ≥98% accuracy
- Data persistence: 100%

### Performance
- CPU usage: <1% average
- Memory: <50MB
- Storage: <100KB/day
- Dashboard load: <500ms

### User Experience
- Time to first track: <30 seconds
- Real-time updates: <2 seconds
- CSV export: <2 seconds for 1 year data

---

## 19) Risk Assessment

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Idle detection unreliable | High | Medium | Fallback with focus events |
| Storage quota exceeded | Medium | Low | Data retention policies |
| Browser API changes | High | Medium | Polyfills, monitoring |
| Service worker killed (MV3) | High | High | State persistence, alarms API |

---

## 20) Privacy & Security

### Privacy Principles
- Local-first data storage
- Zero telemetry
- No third-party servers
- User has full control
- Open source transparency

### Security Measures
- Input validation
- CSP headers
- No eval() or dynamic code
- Minimal permissions
- Regular security audits

### Compliance
- GDPR compliant
- CCPA compliant
- Clear privacy policy
- Right to delete/export

---

## 21) Browser Store Requirements

### Chrome Web Store
- **Name:** Time Tracker - Website Usage Monitor
- **Description:** Track time and visits, privacy-first, local storage
- **Category:** Productivity
- **Screenshots:** 5 required (dashboard, settings, charts, etc.)
- **Privacy policy:** Required

### Edge Add-ons
- Similar to Chrome
- Accessibility statement

### Firefox Add-ons
- License: MIT
- Source code link
- Build instructions

---

## 22) Maintenance Plan

### Schedule
- **Quarterly:** API reviews, major features, security audits
- **Monthly:** Dependencies, bug fixes
- **Weekly:** User feedback monitoring
- **As needed:** Security patches (<48h)

### Support Channels
- GitHub Issues (primary)
- In-app help/FAQ
- Email support (optional)

### Update Strategy
- Semantic versioning (MAJOR.MINOR.PATCH)
- Beta testing before release
- Backward compatibility for 2 major versions

---

## 23) Open Source Strategy

### License
**Recommended:** MIT License (permissive, widely adopted)

### Repository Guidelines
- Main branch protection
- PR reviews required
- Branch strategy: main, develop, feature/*, bugfix/*

### Community
- CONTRIBUTING.md with clear guidelines
- CODE_OF_CONDUCT.md
- Issue templates
- Recognize contributors

---

## 24) API Contract Specification

### Background → UI Messages

```javascript
// Real-time update
{
  type: 'TRACKING_UPDATE',
  payload: {
    siteKey: 'example.com',
    seconds: 1234,
    visits: 5,
    isActive: true
  }
}

// Summary data
{
  type: 'SUMMARY_DATA',
  payload: {
    period: 'day|week|month|quarter|year',
    sites: {
      'example.com': { seconds: 3600, visits: 10 },
      ...
    }
  }
}
```

### UI → Background Messages

```javascript
// Get summary
{
  type: 'GET_SUMMARY',
  payload: {
    period: 'day|week|month|quarter|year',
    date: '2026-01-04' // optional
  }
}

// Add tracking rule
{
  type: 'ADD_RULE',
  payload: {
    type: 'domain|host|prefix',
    value: 'example.com',
    includeSubdomains: true
  }
}

// Remove rule
{
  type: 'REMOVE_RULE',
  payload: {
    ruleId: 'uuid-here'
  }
}
```

---

## 25) Storage Module Spec

### Core Functions

```javascript
// Get aggregated summary
getSummary(period, siteKey = null, date = null)
// Returns: { sites: { [key]: { seconds, visits } } }

// Get time series for charts
getSeries(period, siteKey = null)
// Returns: [{ timestamp, seconds, visits }, ...]

// Save tracking session
saveSession(siteKey, seconds, visits, timestamp)

// Clear data
clearData(before = null) // null = clear all

// Export as CSV
exportCSV(period, siteKey = null)
// Returns: CSV string
```

### Storage Schema

```javascript
// settings
{
  trackedRules: [
    { id, type, value, includeSubdomains, enabled }
  ],
  visitGapSeconds: 30,
  heartbeatMs: 1000,
  notifications: {
    enabled: true,
    thresholds: {
      'example.com': 120 // minutes
    },
    globalLimit: 480
  }
}

// stats:YYYY-MM-DD
{
  sites: {
    'example.com': { seconds: 1234, visits: 7 }
  },
  updatedAt: timestamp
}
```

---

## 26) Next Steps for Development

### Immediate Actions

1. **Choose MV3 strategy:**
   - MV3-only (Chrome/Edge first, Firefox later)
   - OR MV3 + Firefox compatibility from start

2. **Set up repository:**
   - Initialize Git repository
   - Create initial project structure
   - Add README.md and TASKS.md
   - Set up branch protection

3. **Create manifest.json:**
   - Define permissions
   - Set up background service worker
   - Configure UI pages

4. **Implement core tracking:**
   - Background service worker scaffold
   - Event listeners (tabs, windows, idle)
   - Storage module with daily bucketing

### Development Priorities

**Week 1:**
- [ ] Project setup
- [ ] Manifest configuration
- [ ] Background tracker skeleton
- [ ] Storage module implementation

**Week 2:**
- [ ] URL matching/rules system
- [ ] Event-driven tracking logic
- [ ] Unit tests for core functionality

**Week 3-4:**
- [ ] Dashboard UI
- [ ] Settings UI
- [ ] Messaging between UI and background

**Week 5-6:**
- [ ] Charts implementation
- [ ] CSV export
- [ ] Notifications
- [ ] Help section

**Week 7:**
- [ ] Cross-browser testing
- [ ] Accuracy validation
- [ ] Store submission

---

## 27) Browser Manifest Decision

**Recommendation:** Start with **MV3 + Firefox compatibility** approach

### Manifest V3 (Chrome/Edge/Firefox)

```json
{
  "manifest_version": 3,
  "name": "Time Tracker",
  "version": "1.0.0",
  "description": "Track time and visits on websites",
  
  "permissions": [
    "storage",
    "tabs",
    "notifications",
    "idle",
    "alarms"
  ],
  
  "background": {
    "service_worker": "background/tracker.js",
    "type": "module"
  },
  
  "action": {
    "default_popup": "ui/dashboard.html",
    "default_icon": {
      "16": "assets/icons/icon-16.png",
      "48": "assets/icons/icon-48.png",
      "128": "assets/icons/icon-128.png"
    }
  },
  
  "icons": {
    "16": "assets/icons/icon-16.png",
    "48": "assets/icons/icon-48.png",
    "128": "assets/icons/icon-128.png"
  }
}
```

---

## Appendix A: Glossary

- **Service Worker:** Background script in MV3 that handles events
- **eTLD+1:** Effective top-level domain plus one (e.g., example.com from app.example.com)
- **Idle Detection:** Browser API to detect when user is inactive
- **Daily Bucket:** Storage strategy where data is grouped by calendar day
- **Visit Gap:** Time threshold to distinguish separate visits (default 30s)
- **Canonical URL:** Normalized form of URL for consistent matching
- **WebExtensions API:** Cross-browser extension API standard

---

## Appendix B: FAQ for Development Team

**Q: Why daily buckets instead of continuous time series?**  
A: Daily buckets enable efficient aggregation into weeks/months/years without complex queries. Storage is minimal and reads are fast.

**Q: How do we handle timezone changes?**  
A: Use local date keys (YYYY-MM-DD in user's timezone). If timezone changes, new data uses new timezone but historical data remains in original timezone.

**Q: What if storage.local quota is exceeded?**  
A: Implement auto-archiving: compress data older than 3 months, warn users at 80% quota, offer manual deletion.

**Q: Why not use webRequest API for more accurate tracking?**  
A: webRequest requires broad host permissions (privacy concern) and is deprecated in MV3. Our approach uses minimal permissions.

**Q: How accurate can we really get?**  
A: With proper idle detection and 1-second heartbeat, 95-98% accuracy is achievable. The 5% budget accounts for edge cases like system sleep.

**Q: Should we support regex rules in MVP?**  
A: Optional. Start with domain/host/prefix matching. Add regex behind "advanced" toggle if needed.

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-01-04 | Product Team | Initial comprehensive PRD with all sections |

---

**END OF PRD**

Ready for:
- ✅ README.md generation
- ✅ TASKS.md generation  
- ✅ Development kickoff
