# Time Tracker - Website Usage Monitor

> Privacy-first browser extension to track time spent and visits on websites with ≤5% accuracy

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Chrome Web Store](https://img.shields.io/badge/Chrome-Extension-blue)](https://chrome.google.com/webstore)
[![Firefox Add-ons](https://img.shields.io/badge/Firefox-Add--on-orange)](https://addons.mozilla.org/)
[![Edge Add-ons](https://img.shields.io/badge/Edge-Add--on-blue)](https://microsoftedge.microsoft.com/addons)

## 📊 Overview

Time Tracker helps you understand where your time goes online. Get accurate insights into your website usage with complete privacy. All data stays local on your device—no servers, no tracking, no ads.

**Key Highlights:**
- 🎯 **Accurate:** ≤5% error margin in time tracking
- 🔒 **Private:** 100% local storage, zero telemetry
- 📈 **Insightful:** Charts and summaries across multiple time periods
- ⚡ **Lightweight:** <1% CPU usage, <50MB memory
- 🌐 **Cross-browser:** Chrome, Edge, and Firefox support

## ✨ Features

### Core Tracking
- **Accurate Time Tracking** - Know exactly how much time you spend on any website (±5% accuracy)
- **Visit Counter** - Track how many times you visit tracked sites
- **Smart Detection** - Only counts time when tab is active, window focused, and you're not idle
- **Real-Time Updates** - See your current session time tick up live

### Flexible Reporting
- **Multiple Time Periods** - View stats by day, week, month, quarter, or year
- **Visual Charts** - Beautiful bar charts showing your usage patterns
- **Summary Cards** - Quick overview of today, this week, this month, etc.
- **Site Filtering** - Focus on specific sites or view all tracked sites together

### Data Management
- **CSV Export** - Download your stats for external analysis
- **Data Control** - Clear data by period (today, last 7 days, or all)
- **Local Storage** - All data stays on your device, never uploaded

### Customization
- **Auto-Track Everything** - All websites tracked automatically by domain
- **Exclude Sites** - Optionally exclude specific domains from tracking
- **Smart Notifications** - Get alerts when you hit time limits you set
- **Privacy Controls** - Easy data management and export options

## 🔒 Privacy First

We take privacy seriously:

- ✅ **100% Local Storage** - All data stays on your device
- ✅ **No Tracking** - We don't collect any data about you
- ✅ **No External Servers** - Zero network requests to third parties
- ✅ **No Ads** - Completely ad-free experience
- ✅ **Open Source** - Code is public for complete transparency
- ✅ **No Account Required** - Works instantly without sign-up
- ✅ **GDPR & CCPA Compliant** - Full user control over data

## 🚀 Installation

### From Browser Stores (Coming Soon)

**Chrome Web Store:**
```
[Installation link will be available after store approval]
```

**Microsoft Edge Add-ons:**
```
[Installation link will be available after store approval]
```

**Firefox Add-ons:**
```
[Installation link will be available after store approval]
```

### Manual Installation (Development)

#### Chrome/Edge
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/browser-extension-timetracker.git
   cd browser-extension-timetracker
   ```

2. Open Chrome/Edge and navigate to:
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`

3. Enable "Developer mode" (toggle in top-right corner)

4. Click "Load unpacked" and select the `extension` folder

#### Firefox
1. Clone the repository (same as above)

2. Navigate to `about:debugging#/runtime/this-firefox`

3. Click "Load Temporary Add-on"

4. Select any file in the `extension` folder

## 📖 Usage Guide

### Getting Started

1. **Install the extension** following the instructions above

2. **Start browsing** - The extension automatically tracks all websites you visit
   - No setup required!
   - Every website is tracked by domain (e.g., `youtube.com`, `github.com`)
   - Time is counted only when tab is active and you're not idle

3. **View your stats:**
   - Click the extension icon to open the sidebar
   - The sidebar displays your dashboard with time and visit statistics
   - See your time and visits for different periods
   - Use the period selector to change timeframes
   - Filter by specific sites or view all together

4. **Optional - Exclude specific sites:**
   - Go to Settings in the sidebar
   - Find the site you want to exclude
   - Click "Exclude" to stop tracking that domain

### Understanding Tracking

**When time is counted:**
- Tab must be active (currently selected)
- Browser window must be focused
- User must not be idle (no mouse/keyboard activity)

**When a visit is counted:**
- You navigate to a tracked site from a non-tracked site
- You switch to a tracked tab after 30+ seconds of inactivity (configurable)

**Why you might see less time than expected:**
- Switching to another tab/window pauses tracking
- Being idle (away from keyboard) pauses tracking
- Browser extension follows strict counting rules for accuracy

### Setting Time Limits

1. Go to Settings (in the sidebar) → Notifications
2. Enable notifications
3. Set per-site limits (e.g., "Alert me after 2 hours on YouTube")
4. Or set global limit for all tracked sites combined
5. You'll receive a notification when you hit your limit

### Exporting Data

1. Open the sidebar
2. Select the time period you want to export
3. (Optional) Filter to a specific site
4. Click "Export CSV"
5. Save the CSV file to analyze in Excel, Google Sheets, etc.

## 🛠️ Development Setup

### Prerequisites

- **Node.js** 18+ (optional, for build tools)
- **Git** for version control
- Modern browser (Chrome 88+, Edge 88+, or Firefox 109+)

### Local Development

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/browser-extension-timetracker.git
   cd browser-extension-timetracker
   ```

2. **Install dependencies (optional):**
   ```bash
   npm install
   ```

3. **Project Structure:**
   ```
   extension/
   ├── manifest.json          # Extension manifest
   ├── background/            # Background service worker
   │   ├── tracker.js         # Core tracking engine
   │   ├── storage.js         # Storage operations
   │   ├── rules.js           # URL matching
   │   └── notify.js          # Notifications
   ├── ui/                    # User interface
   │   ├── dashboard.html/js/css
   │   ├── settings.html/js/css
   │   └── help.html/js
   ├── assets/                # Icons and images
   ├── vendor/                # Third-party libraries
   └── lib/                   # Shared utilities
   ```

4. **Load extension in browser** (see Installation section above)

5. **Make changes** - Edit files in the `extension` folder

6. **Reload extension:**
   - Chrome/Edge: Go to extensions page, click reload icon
   - Firefox: Click "Reload" in about:debugging

### Running Tests

```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Accuracy tests
npm run test:accuracy
```

### Building for Production

```bash
# Build for all browsers
npm run build

# Build for specific browser
npm run build:chrome
npm run build:firefox
npm run build:edge
```

Builds will be created in `dist/` folder.

## 🤝 Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

### Quick Start for Contributors

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Write/update tests
5. Commit your changes (`git commit -m 'Add amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

### Development Guidelines

- Follow existing code style (ESLint rules)
- Write unit tests for new features
- Update documentation as needed
- Test across all supported browsers
- Keep commits atomic and well-described

### Good First Issues

Look for issues labeled `good-first-issue` if you're new to the project.

## 📋 Roadmap

### Version 1.0 (MVP) - Current
- [x] Core time and visit tracking
- [x] Dashboard with multiple time periods
- [x] Settings for managing tracked sites
- [x] Notifications for time limits
- [x] CSV export
- [x] Cross-browser support (Chrome, Edge, Firefox)

### Version 1.1 - Planned
- [ ] Dark mode theme
- [ ] Site categories/tags (Work, Personal, Learning, etc.)
- [ ] Focus mode with productivity goals
- [ ] Advanced regex rules (behind toggle)
- [ ] Keyboard shortcuts

### Version 2.0 - Future
- [ ] Encrypted multi-device sync (opt-in)
- [ ] Productivity insights and recommendations
- [ ] Weekly/monthly email reports (opt-in)
- [ ] Browser history import for retroactive tracking
- [ ] Custom chart types (pie charts, heatmaps)

See [TASKS.md](TASKS.md) for detailed development tasks.

## 🧪 Testing & Accuracy

We take accuracy seriously. The extension is designed to maintain ≤5% error margin:

- **Event-driven architecture** - Uses browser APIs to detect tab/window changes
- **1-second heartbeat** - Continuous time accumulation with minimal overhead
- **Idle detection** - Automatically pauses when user is inactive
- **Tested scenarios** - Controlled stopwatch tests validate accuracy

**Known Limitations:**
- System sleep/hibernate time is not counted (by design)
- Idle detection relies on OS/browser idle API (may vary by system)
- Background audio/video tabs are not counted (must be active tab)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with native Chrome Extension APIs (Manifest V3)
- Charts rendered with HTML5 Canvas for zero dependencies
- Icons from browser-native resources
- Inspired by the need for privacy-respecting productivity tools

## 📞 Support

- **Bug Reports:** [GitHub Issues](https://github.com/yourusername/browser-extension-timetracker/issues)
- **Feature Requests:** [GitHub Issues](https://github.com/yourusername/browser-extension-timetracker/issues)
- **Documentation:** [Wiki](https://github.com/yourusername/browser-extension-timetracker/wiki)
- **Email:** support@timetracker.example (for privacy-sensitive issues)

## 📊 Stats

- **Accuracy:** ≥95% (≤5% error margin)
- **Performance:** <1% CPU usage, <50MB RAM
- **Storage:** ~100KB per day (typical usage)
- **Supported Sites:** Unlimited
- **Languages:** English (more coming in Phase 2)

## 🔗 Links

- [Product Requirements Document](PRD.md)
- [Development Tasks](TASKS.md)
- [Contributing Guidelines](CONTRIBUTING.md)
- [Changelog](CHANGELOG.md)
- [Privacy Policy](PRIVACY.md)

---

**Made with ❤️ for productivity enthusiasts who value their privacy**

Star ⭐ this repository if you find it useful!
