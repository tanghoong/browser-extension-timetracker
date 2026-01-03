# Contributing to Time Tracker Extension

Thank you for your interest in contributing to Time Tracker! This document provides guidelines and instructions for contributing.

## Code of Conduct

This project follows a code of conduct. By participating, you are expected to uphold this code:
- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

## How to Contribute

### Reporting Bugs

Before creating a bug report:
1. Check the [existing issues](https://github.com/yourusername/browser-extension-timetracker/issues) to avoid duplicates
2. Ensure you're using the latest version
3. Verify the issue in multiple browsers if possible

When reporting a bug, include:
- Browser name and version
- Extension version
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots (if applicable)
- Console errors (if any)

### Suggesting Features

Feature requests are welcome! Please:
1. Check existing issues/PRs to avoid duplicates
2. Clearly describe the feature and its use case
3. Explain why this feature would be useful to most users
4. Consider if it fits the project's privacy-first philosophy

### Development Setup

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/yourusername/browser-extension-timetracker.git
   cd browser-extension-timetracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Load extension in browser:**
   - Chrome/Edge: Navigate to `chrome://extensions/`, enable Developer mode, click "Load unpacked", select `extension` folder
   - Firefox: Navigate to `about:debugging#/runtime/this-firefox`, click "Load Temporary Add-on", select any file in `extension` folder

4. **Make your changes** in the `extension` folder

5. **Test thoroughly:**
   ```bash
   npm test
   npm run lint
   ```

### Code Style

- Follow the ESLint configuration (`.eslintrc.json`)
- Use Prettier for formatting (`.prettierrc.json`)
- Run `npm run lint:fix` and `npm run format` before committing
- Write descriptive commit messages
- Add comments for complex logic
- Keep functions small and focused

### Testing Requirements

All new features must include:
- Unit tests with >80% code coverage
- Manual testing across Chrome, Edge, and Firefox
- Documentation updates

### Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes:**
   - Write clean, documented code
   - Add/update tests
   - Update documentation

3. **Commit your changes:**
   ```bash
   git commit -m "Add feature: brief description"
   ```
   
   Use conventional commit format:
   - `feat:` for new features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `test:` for tests
   - `refactor:` for refactoring
   - `style:` for formatting
   - `chore:` for maintenance

4. **Push and create PR:**
   ```bash
   git push origin feature/your-feature-name
   ```
   Then create a Pull Request on GitHub

5. **PR requirements:**
   - Clear description of changes
   - Reference related issues
   - All tests passing
   - No linting errors
   - Screenshots for UI changes
   - Updated documentation

### Review Process

- Maintainers will review PRs within 1 week
- Address feedback constructively
- Keep PRs focused on a single issue/feature
- Be patient and respectful

## Development Guidelines

### Architecture Principles

- **Privacy First:** Never collect or transmit user data
- **Minimal Permissions:** Only request necessary browser permissions
- **Performance:** Keep CPU <1%, memory <50MB
- **Accuracy:** Maintain ≤5% error in time tracking
- **Cross-browser:** Test on Chrome, Edge, and Firefox

### File Organization

```
extension/
├── background/     # Background service worker logic
├── ui/             # User interface pages
├── lib/            # Shared utilities
├── vendor/         # Third-party libraries
└── assets/         # Icons and images
```

### Coding Standards

- Use modern JavaScript (ES2021+)
- Prefer const/let over var
- Use async/await over promises when possible
- Avoid global variables
- Handle errors gracefully
- Add JSDoc comments for functions

### Testing Standards

- Write tests before or alongside code (TDD preferred)
- Test edge cases and error conditions
- Mock browser APIs appropriately
- Aim for >80% code coverage
- Test cross-browser compatibility

## Community

- **Questions?** Open a [GitHub Discussion](https://github.com/yourusername/browser-extension-timetracker/discussions)
- **Found a bug?** Create an [Issue](https://github.com/yourusername/browser-extension-timetracker/issues)
- **Want to chat?** (Future: Discord/Slack link)

## Recognition

Contributors will be:
- Listed in README.md
- Credited in release notes
- Acknowledged in project documentation

Thank you for contributing to Time Tracker! 🎉
