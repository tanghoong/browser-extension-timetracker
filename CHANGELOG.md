# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
