# Contributing to LendEarn

Thank you for your interest in contributing to LendEarn! This document provides guidelines and instructions for contributing to the project.

## 🎯 Our Vision

LendEarn is building a decentralized peer-to-peer lending platform on Shardeum with an innovative referral system. We welcome contributions that:

- Improve the user experience
- Add new features aligned with our roadmap
- Enhance mobile responsiveness
- Fix bugs and security issues
- Improve documentation
- Optimize performance

## 📋 Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Assume good intentions
- Report issues responsibly
- Follow best practices

## 🚀 Getting Started

### 1. Fork the Repository

```bash
# Visit https://github.com/Emiloart/lendearn
# Click "Fork" button in top-right
```

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/lendearn.git
cd lendearn
```

### 3. Add Upstream Remote

```bash
git remote add upstream https://github.com/Emiloart/lendearn.git
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Create Feature Branch

```bash
git checkout -b feature/your-feature-name
# or for bug fixes:
git checkout -b fix/bug-description
```

## 💻 Development Workflow

### Running the Project

```bash
# Start development server
npm start

# Run tests
npm test

# Build for production
npm run build
```

### Code Style

We follow these conventions:

- **JavaScript**: ES6+, clean and readable
- **React**: Functional components with hooks
- **CSS**: Mobile-first, using CSS variables from design system
- **Naming**: camelCase for functions/variables, PascalCase for components
- **Comments**: Clear, concise, and meaningful

### Component Structure

```
src/
├── components/
│   ├── Button/
│   │   ├── Button.jsx
│   │   ├── Button.css
│   │   └── Button.test.js
│   └── Card/
│       ├── Card.jsx
│       ├── Card.css
│       └── Card.test.js
├── pages/
│   ├── Home/
│   │   ├── Home.jsx
│   │   ├── Home.css
│   │   └── Home.test.js
└── styles/
    ├── globals.css
    ├── variables.css
    └── responsive.css
```

### Creating a Component

```jsx
// MyComponent.jsx
import './MyComponent.css';

/**
 * MyComponent - Brief description
 * 
 * @param {string} title - Component title
 * @param {ReactNode} children - Child elements
 * @returns {ReactElement} Rendered component
 */
function MyComponent({ title, children }) {
  return (
    <div className="my-component">
      <h2>{title}</h2>
      {children}
    </div>
  );
}

export default MyComponent;
```

### Styling Components

```css
/* MyComponent.css */
@import '../styles/variables.css';

.my-component {
  padding: var(--spacing-lg);
  background-color: var(--color-bg-primary);
  border: 1px solid var(--color-border-light);
  border-radius: var(--radius-lg);
  transition: all var(--transition-base);
}

.my-component h2 {
  margin-bottom: var(--spacing-md);
  color: var(--color-text-primary);
}

/* Mobile */
@media (max-width: 639px) {
  .my-component {
    padding: var(--spacing-md);
  }
}

/* Responsive */
@media (min-width: 1024px) {
  .my-component {
    padding: var(--spacing-xl);
  }
}
```

## ✅ Testing

### Write Tests

```bash
# Run tests
npm test

# Run with coverage
npm test -- --coverage
```

### Test Structure

```jsx
// MyComponent.test.js
import { render, screen } from '@testing-library/react';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders with title', () => {
    render(<MyComponent title="Test" />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
```

## 🔍 Before Submitting

### Checklist

- [ ] Code follows project style guide
- [ ] Tests pass (`npm test`)
- [ ] Build succeeds (`npm run build`)
- [ ] Mobile responsive (tested at 375px, 768px, 1024px)
- [ ] Accessibility checked (contrast, keyboard nav, ARIA labels)
- [ ] No console errors or warnings
- [ ] Documentation updated if needed
- [ ] Commit messages are clear and descriptive

### Mobile Testing

Test your changes on multiple screen sizes:

```bash
# Use Chrome DevTools
# Press F12 → Toggle device toolbar (Ctrl+Shift+M)
# Test at: 375px, 640px, 768px, 1024px, 1280px
```

### Accessibility Testing

- Check text contrast (use contrast checker)
- Test keyboard navigation (Tab, Shift+Tab, Enter)
- Verify ARIA labels where needed
- Test with screen reader (VoiceOver, NVDA)

## 📝 Commit Messages

Write clear, descriptive commit messages:

```
feat: Add new lending feature
fix: Resolve button styling issue on mobile
docs: Update setup instructions
style: Format code per project guidelines
test: Add tests for Button component
refactor: Simplify form validation logic
chore: Update dependencies
```

Format:
```
<type>(<scope>): <subject>

<body>

<footer>
```

Examples:
```
feat(ui): Add responsive navigation menu

- Implement hamburger menu for mobile
- Add smooth animations
- Test on multiple devices

Closes #42

fix(forms): Fix email validation on iOS

Prevent auto-zoom when input is 16px

Closes #15
```

## 🔀 Creating a Pull Request

### 1. Update Your Branch

```bash
# Fetch latest from upstream
git fetch upstream

# Rebase on main
git rebase upstream/main
```

### 2. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 3. Create Pull Request

- Visit your fork on GitHub
- Click "Compare & pull request"
- Fill in PR template:

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] New feature
- [ ] Bug fix
- [ ] Documentation update
- [ ] UI/Design improvement

## Testing Done
- [ ] Unit tests
- [ ] Mobile testing (375px, 768px, 1024px)
- [ ] Accessibility tested
- [ ] No console errors

## Screenshots (if applicable)
Add screenshots for UI changes

## Related Issues
Closes #123
```

### 4. Respond to Feedback

- Address reviewer comments
- Re-test after changes
- Keep commits clean and meaningful

## 🐛 Reporting Bugs

### Bug Report Template

```markdown
## Description
Clear description of the bug

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- Device: iPhone 12
- Browser: Safari
- OS: iOS 15
- App Version: 0.1.0

## Logs/Screenshots
Attach relevant error logs or screenshots
```

### Security Issues

Do not open public issues for security vulnerabilities. Instead, email:
```
security@lendearn.com
```

## 💡 Feature Requests

### Feature Request Template

```markdown
## Description
Clear description of the feature

## Problem Solved
What problem does this solve?

## Proposed Solution
How should this be implemented?

## Alternatives Considered
Other possible approaches

## Additional Context
Sketches, mockups, or references
```

## 📚 Documentation

### Update Documentation When:

- Adding new features
- Changing existing behavior
- Adding configuration options
- Modifying setup process

### Documentation Files

- `README.md` - Main documentation
- `DESIGN_SYSTEM.md` - UI/UX guidelines
- `MOBILE_OPTIMIZATION.md` - Mobile best practices
- Component comments - Inline documentation

### JSDoc Example

```javascript
/**
 * Validates email address
 * 
 * @param {string} email - Email to validate
 * @returns {boolean} True if valid email format
 * @throws {Error} If email is not a string
 * 
 * @example
 * const isValid = validateEmail('user@example.com');
 * // Returns: true
 */
function validateEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}
```

## 🎓 Learning Resources

- [React Documentation](https://react.dev)
- [MDN Web Docs](https://developer.mozilla.org)
- [Web Accessibility](https://www.w3.org/WAI/)
- [Design System](./DESIGN_SYSTEM.md)
- [Mobile Optimization](./MOBILE_OPTIMIZATION.md)

## 🏆 Contribution Recognition

Contributors are recognized in:
- `CONTRIBUTORS.md` (maintained by project)
- GitHub contributors page
- Potential future acknowledgments

## ❓ Questions?

- Check existing [issues](https://github.com/Emiloart/lendearn/issues)
- Search [discussions](https://github.com/Emiloart/lendearn/discussions)
- Ask in PR comments
- Create a new discussion

## 📋 Additional Guidelines

### Before Large Changes

For major features or architectural changes:

1. Open an issue for discussion first
2. Get feedback from maintainers
3. Create detailed specification
4. Break into smaller PRs if possible

### Performance Considerations

- Minimize bundle size
- Optimize re-renders
- Use lazy loading for large components
- Optimize images and assets

### Browser Support

Test on:
- Chrome (latest 2 versions)
- Safari (latest 2 versions)
- Firefox (latest 2 versions)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## 🎉 Thank You!

Your contributions help make LendEarn better for everyone. We appreciate your time and effort!

---

**Happy contributing!** 🚀
