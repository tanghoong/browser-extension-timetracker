# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed
- **BREAKING**: Converted extension from popup to sidebar display
  - Extension now opens in browser sidebar instead of popup window
  - Requires Chrome/Edge 114+ for sidebar support
  - Updated manifest.json to use `side_panel` API
  - Clicking extension icon now opens persistent sidebar
  - Made all UI layouts fully responsive for sidebar

### Security
- **CRITICAL**: Fixed XSS vulnerability in settings page
  - Replaced unsafe `innerHTML` with safe DOM element creation
  - All user-generated content now properly escaped
- **CRITICAL**: Fixed CSV injection vulnerability in data export
  - Added `escapeCSV()` function to sanitize all CSV fields
  - Prevents formula execution in Excel/LibreOffice
  - Applied to all fields including numeric ones

### Fixed
- Fixed 200+ ESLint errors throughout codebase
- Fixed case declaration issues in switch statements
- Removed unused imports and variables
- Improved site filter robustness and error handling
- Better value restoration after UI updates

### Improved
- Enhanced code quality and consistency throughout
- Added flexbox and CSS Grid for better layout handling
- Improved scrolling behavior for long content lists
- Better wrapping for smaller sidebar widths
- Added `.eslintignore` for vendor files

### Documentation
- Updated README.md to reflect sidebar usage
- Updated installation and usage instructions
- Modified all references from popup to sidebar

### Added
- Initial project setup
- Project structure and configuration files
- Documentation (README.md, TASKS.md, PRD.md)

## [1.0.0] - TBD

### Added
- Core time tracking functionality with ≤5% error margin
- Visit counting with configurable gap threshold
- Dashboard UI with multiple time periods (day, week, month, quarter, year)
- Summary cards showing quick insights
- Charts for visualizing time and visit data
- Settings page for managing tracked sites
- Notification system for time limit alerts
- CSV export functionality
- Help section with FAQs and documentation
- Privacy-first local storage (no external servers)
- Cross-browser support (Chrome, Edge, Firefox)
- Real-time tracking updates
- Idle detection and focus management
- Midnight crossover handling
- Service worker recovery on restart

### Security
- Input validation for all user-provided rules
- CSP headers for XSS protection
- Minimal permissions (storage, tabs, notifications, idle, alarms)
- No eval() or dynamic code execution

[Unreleased]: https://github.com/yourusername/browser-extension-timetracker/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/yourusername/browser-extension-timetracker/releases/tag/v1.0.0
