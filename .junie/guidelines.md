# DXOS Developer Guidelines

## Project Overview

**DXOS** is a Decentralized Operating System platform for building fully decentralized applications. The main product is **Composer** - an extensible IDE for real-time and async collaboration.

**Tech Stack:**
- TypeScript
- React
- pnpm (package manager)
- moon (build system)
- Vitest (testing)
- Playwright (e2e testing)
- Storybook (component documentation)

## Project Structure

```
dxos/
├── packages/           # Main codebase organized by domain
│   ├── apps/          # Applications (Composer, tasks-app, etc.)
│   ├── common/        # Shared utilities and libraries
│   ├── core/          # Core DXOS functionality
│   ├── devtools/      # Development tools
│   ├── e2e/           # End-to-end test suites
│   ├── plugins/       # Plugin ecosystem
│   ├── sdk/           # Software Development Kit
│   └── ui/            # UI components and themes
├── tools/             # Build tools and development utilities
├── scripts/           # Automation scripts
└── docs/              # Documentation
```

## Development

When building, linting, or testing, do not use `npm`, `npx`, or `pnpm`. Only use `moon`.

When referring to a package, run the command from the root of the repository and refer to the package only by name, e.g. to build the package located at `packages/ui/react-ui-table`, simply `cd` to the root of this repository and run `moon react-ui-table:build`.

```bash
moon <package>:lint -- --fix # Lint and fix code
moon <package>:build         # Compile and build a package
```

### Unit Tests
```bash
moon <package>:test       # Test specific package
```

### E2E Tests
```bash
moon <package>:e2e            # Run Playwright tests
moon <package>:e2e -- --debug # Debug with Playwright inspector
```

## Key Scripts & Tools

### Development Tools
- `tools/toolbox/` - Development utilities
- `tools/dx-build/` - Custom build system
- `tools/beast/` - Documentation generator

## Best Practices

### Code Organization
- Follow the existing package structure.
- Keep packages focused and cohesive.
- Use workspace dependencies (`workspace:*`).
- Maintain clear separation between UI, core, and plugins.

### Development
- Always run `pnpm i` and `moon :build` when switching branches.
- Run tests before committing changes.
- When writing comments, use proper punctuation, especially ending full sentences with a full stop, ‘.’, even if the comment doesn’t have another sentence.
- Always memoize any functions or values computed in the closure of a React component’s render function by using `useMemo`, `useCallback`, etc.

### Dependencies
- Use `npm-check-updates` for updates, not `pnpm up`.
- Re-run `pnpm i` after dependency changes.

### Testing
- Write unit tests with Vitest.
- Use Playwright for e2e tests following tools/executors/test/PLAYWRIGHT.md.
