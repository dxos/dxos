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

## Development Setup

### Prerequisites
```bash
# Install native libraries (macOS)
brew install cairo giflib git-lfs jpeg libpng librsvg pango pkg-config python-setuptools git unzip gzip xz

# Install proto (toolchain manager)
bash <(curl -fsSL https://moonrepo.dev/install/proto.sh)

# Setup proto for shell
eval "$(proto activate zsh --config-mode all)"
```

### Initial Setup
```bash
# Install toolchain
proto install

# Install dependencies
pnpm i

# Build everything
moon :build
```

## Development Workflow

### Running Applications
```bash
moon composer-app:serve    # Main Composer IDE
moon tasks-app:serve      # Tasks application
moon docs:serve           # Documentation site
```

### Development Commands
```bash
moon <package>:lint -- --fix # Lint and fix code
moon <package>:build         # Compile and build a package
```

## Testing

### Unit Tests
```bash
moon <package>:test       # Test specific package
moon <package>:test-watch # Watch mode for package
```

### E2E Tests
```bash
moon <package>:e2e            # Run Playwright tests
moon <package>:e2e -- --debug # Debug with Playwright inspector
```

### Storybook
```bash
moon storybook:serve     # Launch component documentation
```

## Key Scripts & Tools

### Development Tools
- `tools/toolbox/` - Development utilities
- `tools/dx-build/` - Custom build system
- `tools/storybook/` - Component documentation
- `tools/beast/` - Documentation generator

## Best Practices

### Code Organization
- Follow the existing package structure
- Keep packages focused and cohesive
- Use workspace dependencies (`workspace:*`)
- Maintain clear separation between UI, core, and plugins

### Development
- Always run `pnpm i` and `moon :build` when switching branches
- Use `pnpm watch` during development for hot reloading
- Run tests before committing changes
- Check the REPOSITORY_GUIDE.md for detailed workflows

### Dependencies
- Use `npm-check-updates` for updates, not `pnpm up`
- Re-run `pnpm i` after dependency changes

### Testing
- Write unit tests with Vitest
- Use Playwright for e2e tests following tools/executors/test/PLAYWRIGHT.md
- Test components in Storybook
