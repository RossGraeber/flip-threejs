# Contributing to flip-threejs

Thank you for your interest in contributing to flip-threejs! This document provides guidelines and instructions for contributing to the project.

## Code of Conduct

Be respectful, professional, and constructive in all interactions. We aim to maintain a welcoming environment for all contributors.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm (comes with Node.js)
- Git

### Setting Up Your Development Environment

1. Fork the repository on GitHub
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/flip-threejs.git
   cd flip-threejs
   ```

3. Add the upstream repository:
   ```bash
   git remote add upstream https://github.com/RossGraeber/flip-threejs.git
   ```

4. Install dependencies:
   ```bash
   npm install
   ```

5. Create a new branch for your work:
   ```bash
   git checkout -b feature/your-feature-name
   ```

## Development Workflow

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build the library
- `npm test` - Run tests in watch mode
- `npm run test:run` - Run tests once
- `npm run test:coverage` - Generate coverage report
- `npm run lint` - Check code for linting issues
- `npm run lint:fix` - Auto-fix linting issues
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run typecheck` - Run TypeScript type checking
- `npm run quality` - Run all quality checks (lint + format + typecheck)
- `npm run quality:fix` - Auto-fix linting and formatting issues
- `npm run validate` - Run all checks + tests + build (pre-PR validation)

### Making Changes

1. Make your changes in your feature branch
2. Write or update tests as needed
3. Ensure all tests pass: `npm run test:run`
4. Ensure code quality: `npm run quality`
5. Build to verify: `npm run build`

### Code Style

This project uses ESLint and Prettier to enforce code style:

- Use TypeScript for all code
- Follow the existing code patterns
- No emojis or em-dashes in code or comments
- Use meaningful variable and function names
- Add JSDoc comments for public APIs
- Keep functions focused and modular

### Commit Guidelines

We use conventional commits for clear history:

```
<type>(<scope>): <subject>

<body>

<footer>
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Test additions or changes
- `chore`: Build process or auxiliary tool changes

Example:
```
feat(triangulation): add edge flipping support

Implements the core edge flip operation for intrinsic triangulations.
Includes validation and connectivity updates.

Closes #123
```

### Git Hooks

This project uses Husky for Git hooks:

- **pre-commit**: Runs lint-staged (linting and formatting on staged files)
- **pre-push**: Runs all tests

These hooks help maintain code quality automatically.

## Testing

### Writing Tests

- Place unit tests in `tests/unit/` mirroring the source structure
- Use descriptive test names
- Test both happy paths and edge cases
- Aim for high coverage (80%+ target)

### Test Structure

```typescript
import { describe, it, expect } from 'vitest';
import { YourClass } from '../../../src/path/to/YourClass';

describe('YourClass', () => {
  describe('methodName', () => {
    it('should handle normal case', () => {
      // Arrange
      const instance = new YourClass();

      // Act
      const result = instance.methodName();

      // Assert
      expect(result).toBe(expectedValue);
    });

    it('should handle edge case', () => {
      // Test edge cases
    });
  });
});
```

## Pull Request Process

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run validation**:
   ```bash
   npm run validate
   ```

3. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Create Pull Request**:
   - Go to GitHub and create a PR from your fork
   - Fill out the PR template completely
   - Reference any related issues
   - Ensure all CI checks pass

5. **Address Review Comments**:
   - Make requested changes
   - Push updates to your branch
   - Respond to comments

6. **Merge**:
   - Once approved, a maintainer will merge your PR
   - Your branch will be deleted after merge

## Project Structure

```
flip-threejs/
├── src/                  # Source code
│   ├── core/            # Core mesh data structures
│   ├── geometry/        # Geometric utilities
│   ├── types/           # TypeScript type definitions
│   └── index.ts         # Main entry point
├── tests/               # Test files
│   └── unit/           # Unit tests
├── docs/               # Documentation (generated)
└── dist/               # Build output (generated)
```

## Key Concepts

### Intrinsic Triangulation

The library uses intrinsic triangulations where connectivity is defined by edge lengths rather than 3D positions. This allows edge flips without changing the surface geometry.

### Halfedge Data Structure

Meshes are represented using a halfedge data structure with:
- Vertices: Points with positions and connectivity
- Edges: Undirected edges with length
- Halfedges: Directed edges with twin, next, prev pointers
- Faces: Triangular faces

### Three.js Integration

The library integrates with Three.js by:
- Accepting `BufferGeometry` as input
- Using Three.js vector types where appropriate
- Following Three.js conventions

## Documentation

### Code Comments

- Use JSDoc for public APIs
- Document parameters, return values, and exceptions
- Explain complex algorithms
- Keep comments concise and focused on "why" not "what"

### API Documentation

API docs are generated using TypeDoc:
```bash
npm run docs
```

## Questions?

- Open an issue for bugs or feature requests
- Start a discussion for questions or ideas
- Check existing issues before creating new ones

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Recognition

Contributors will be recognized in the project's README and release notes.

Thank you for contributing to flip-threejs!
