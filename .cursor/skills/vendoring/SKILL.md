---
name: dxos-vendoring
description: >-
  Guide for vendoring external packages in DXOS. Use when creating new vendored
  packages, updating existing vendor packages, or migrating dependencies to use
  vendored versions.
---

# Vendoring Packages in DXOS

Vendored packages live in the `vendor/` directory and follow a consistent pattern for bundling, exporting, and typing external dependencies.

## Why Vendor Dependencies

- They might use obsolete standards (e.g., CJS instead of ESM).
- They might not work out-of-the-box with existing tools (e.g., Vite 8's Rolldown).
- We might want to patch or stub out some of their functionality.
- Reduces the amount of tooling workarounds and cognitive load in upstream dependencies.
- Provides a single source of truth for types (passthrough from `@types/*` packages).

## Naming Convention

- Package name: `@dxos/vendor-<name>`
- Directory: `vendor/<name>/`
- Moon ID: `vendor-<name>`
- When shipping multiple related deps at once, use `@dxos/vendor-<group-name>/<package-name>` export pattern.

## Package Structure

```
vendor/<name>/
├── package.json       # Package manifest
├── moon.yml           # Moon task configuration
├── tsconfig.json      # TypeScript configuration (minimal)
├── src/
│   ├── <name>.js      # Entry point that re-exports the original package
│   └── <name>.d.ts    # Type definitions (passthrough from @types/* or hand-written)
└── dist/              # Built output (committed for publishing)
    └── lib/
        └── <platform>/
            └── <name>.mjs
```

## package.json Template

```json
{
  "name": "@dxos/vendor-<name>",
  "version": "0.8.3",
  "homepage": "https://dxos.org",
  "bugs": "https://github.com/dxos/dxos/issues",
  "repository": {
    "type": "git",
    "url": "https://github.com/dxos/dxos"
  },
  "license": "MIT",
  "author": "info@dxos.org",
  "type": "module",
  "exports": {
    ".": {
      "types": "./src/<name>.d.ts",
      "default": "./dist/lib/<platform>/<name>.mjs"
    }
  },
  "files": ["dist", "src"],
  "dependencies": {},
  "devDependencies": {
    "<original-package>": "catalog:",
    "@types/<original-package>": "catalog:"
  },
  "publishConfig": {
    "access": "public"
  }
}
```

### Key Points

- **`type: "module"`**: All vendored packages use ESM.
- **`exports`**: Use conditional exports with `types` first, then platform-specific or `default`.
- **`files`**: Include both `dist` (built output) and `src` (types and source).
- **`devDependencies`**: Original package and its types go here (bundled at build time).
- **`dependencies`**: Only runtime dependencies that should NOT be bundled.

## moon.yml Template

```yaml
id: vendor-<name>
layer: library
language: typescript
tags:
  - vendor
  - pack
workspace:
  inheritedTasks:
    exclude:
      - lint

tasks:
  compile:
    args:
      - '--entryPoint=src/<name>.js'
      - '--platform=<platform>' # browser, node, or neutral
      - '--bundlePackage=<original-package>'
      # Add more --bundlePackage for transitive deps if needed
```

### Platform Options

- `browser`: For browser-only packages.
- `node`: For Node.js-only packages.
- `neutral`: For packages that work in both environments.

## tsconfig.json Template

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist/types"
  },
  "include": ["src/**/*"]
}
```

## Source Files

### Entry Point (`src/<name>.js`)

Simple re-export of the original package:

```javascript
//
// Copyright 2026 DXOS.org
//

export * from '<original-package>';
```

If the package needs patching (e.g., UTF-8 issues), include the fixed source directly.

### Type Definitions (`src/<name>.d.ts`)

Passthrough types from `@types/*` package:

```typescript
//
// Copyright 2026 DXOS.org
//

export * from '<original-package>';
```

If `@types/*` doesn't exist or needs augmentation, hand-write the `.d.ts` file.

For packages with complex type exports, you may need to explicitly re-export specific types:

```typescript
//
// Copyright 2026 DXOS.org
//

export * from '<original-package>';
export type { SomeInternalType } from '<original-package>/typings/internal';
```

## Updating Consumers

After creating a vendored package, update all consumers:

1. Replace `"<original-package>": "catalog:"` with `"@dxos/vendor-<name>": "workspace:*"` in `dependencies`.
2. Remove `"@types/<original-package>": "catalog:"` from `devDependencies` (types are included).
3. Update imports: `import * as Foo from '<original-package>'` → `import * as Foo from '@dxos/vendor-<name>'`.
4. Remove any workarounds (e.g., `optimizeDeps.exclude`, `resolve.alias`, custom typings).

## Building

```bash
# Build a specific vendor package
moon run vendor-<name>:compile

# Build all vendor packages
moon run :compile --query "tag=vendor"
```

## Examples

### Simple Package (hyperformula)

- Single entry point, neutral platform.
- Types passthrough from the original package's built-in types.
- See: `vendor/hyperformula/`

### Package with Multiple Exports (hypercore)

- Multiple entry points (`hypercore`, `hypercore-crypto`).
- Platform-specific builds (browser vs node).
- Custom type definitions.
- See: `vendor/hypercore/`

### Package with WASM (quickjs)

- Platform-specific entry points (`node.js`, `browser.js`).
- Custom WASM loading logic.
- See: `vendor/quickjs/`

## Checklist for New Vendor Package

- [ ] Create directory: `vendor/<name>/`
- [ ] Create `package.json` with correct exports and dependencies.
- [ ] Create `moon.yml` with `vendor` and `pack` tags, lint excluded.
- [ ] Create `tsconfig.json` extending base config.
- [ ] Create `src/<name>.js` entry point.
- [ ] Create `src/<name>.d.ts` type definitions (passthrough or hand-written).
- [ ] Add original package to pnpm catalog if not present.
- [ ] Add `@types/*` package to pnpm catalog if available.
- [ ] Run `pnpm install` to update lockfile.
- [ ] Run `moon run vendor-<name>:compile` to build.
- [ ] Update all consumers to use vendored package.
- [ ] Remove workarounds from vite/vitest configs.
- [ ] Run tests to verify everything works.
