# Contributing to FeelFree AI CLI

Thank you for your interest in contributing! ?éâ

## ?åü How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/dhsgud/feelfreeai-cli/issues)
2. If not, create a new issue with:
   - Clear title
   - Detailed description
   - Steps to reproduce
   - Expected vs actual behavior
   - Environment info (OS, Node version)
   - Screenshots if applicable

### Suggesting Features

1. Check existing feature requests
2. Create a new issue with tag `enhancement`
3. Describe:
   - Use case
   - Proposed solution
   - Alternative solutions considered
   - Additional context

### Pull Requests

1. **Fork** the repository
2. **Create a branch** from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Write tests** for new features
5. **Run tests**:
   ```bash
   npm test
   npm run lint
   npm run format
   ```
6. **Commit** with clear messages:
   ```bash
   git commit -m "feat: add amazing feature"
   ```
7. **Push** to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```
8. **Open a Pull Request**

## ?ìù Commit Message Guidelines

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation only
- `style:` Code style (formatting, semicolons, etc.)
- `refactor:` Code refactoring
- `test:` Adding tests
- `chore:` Build process, dependencies

Examples:
```
feat: add session export functionality
fix: resolve file path on Windows
docs: update README with examples
test: add unit tests for parser
```

## ?ß™ Testing

### Running Tests

```bash
# All tests
npm test

# Unit tests only
npm run test:unit

# Coverage
npm run test:coverage

# Watch mode
npm test -- --watch
```

### Writing Tests

- Place tests in `tests/unit/` or `tests/integration/`
- Use descriptive test names
- Follow AAA pattern (Arrange, Act, Assert)
- Mock external dependencies
- Aim for 80%+ coverage

Example:
```typescript
describe('Parser', () => {
  it('should parse file reference correctly', () => {
    const input = '@README.md explain this';
    const result = preprocessInput(input);
    
    expect(result.type).toBe('file-reference');
    expect(result.files).toEqual(['README.md']);
  });
});
```

## ?é® Code Style

We use ESLint and Prettier:

```bash
# Check for lint errors
npm run lint

# Auto-fix lint errors
npm run lint:fix

# Format code
npm run format
```

### Style Guide

- Use TypeScript
- Prefer `const` over `let`
- Use async/await over promises
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Use meaningful variable names

## ?ìÅ Project Structure

```
feelfreeai-cli/
?ú‚??Ä src/
??  ?ú‚??Ä cli/          # CLI commands
??  ?ú‚??Ä config/       # Configuration
??  ?ú‚??Ä conversation/ # Session management
??  ?ú‚??Ä files/        # File operations
??  ?î‚??Ä providers/    # LLM providers
?ú‚??Ä tests/
??  ?ú‚??Ä unit/         # Unit tests
??  ?î‚??Ä integration/  # Integration tests
?ú‚??Ä dist/             # Build output
?î‚??Ä docs/             # Documentation
```

## ?îç Development Setup

1. **Clone repository**:
   ```bash
   git clone https://github.com/dhsgud/feelfreeai-cli.git
   cd feelfreeai-cli
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Build**:
   ```bash
   npm run build
   ```

4. **Run in dev mode**:
   ```bash
   npm run dev
   ```

5. **Link for local testing**:
   ```bash
   npm link
   feelfree --help
   ```

## ?åç Korean Language Support

When contributing Korean language strings:

- Add to `src/config/locales/ko.ts`
- Keep messages friendly and professional
- Use appropriate honorifics (Ï°¥ÎåìÎß?
- Test with Korean input

## ?ìö Documentation

- Update README.md for user-facing changes
- Update JSDoc comments for API changes
- Add examples for new features
- Keep CHANGELOG.md updated

## ??Review Checklist

Before submitting PR, ensure:

- [ ] Code follows style guide
- [ ] Tests pass (`npm test`)
- [ ] Lint passes (`npm run lint`)
- [ ] Documentation updated
- [ ] Commits follow convention
- [ ] Branch is up to date with `main`
- [ ] PR description is clear

## ?§ù Code of Conduct

- Be respectful and inclusive
- Welcome newcomers
- Focus on constructive feedback
- Assume good intentions

## ?ìû Questions?

- Open a [Discussion](https://github.com/dhsgud/feelfreeai-cli/discussions)
- Join our community chat
- Email: your.email@example.com

Thank you for contributing! ?ôè
