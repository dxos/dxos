# @dxos/vitest-plugin-import-source

A Vite plugin that resolves npm package imports to their source files using conditional exports.

## Overview

This plugin intercepts module resolution for npm packages and attempts to resolve them to their source files instead of their built/compiled versions. It uses the `oxc-resolver` with `conditionNames: ['source']` to find source files when available.

## Usage

```typescript
import { defineConfig } from 'vitest/config';
import PluginImportSource from '@dxos/vitest-plugin-import-source';

export default defineConfig({
  plugins: [
    PluginImportSource({
      include: ['**'],
      exclude: ['**/node_modules/**'],
      verbose: false
    })
  ]
});
```

## Options

- `include` (string[]): Glob patterns for files to include. Default: `['**']`
- `exclude` (string[]): Glob patterns for files to exclude. Default: `['**/node_modules/**']`
- `verbose` (boolean): Enable verbose logging. Default: `!!process.env.IMPORT_SOURCE_DEBUG`

## How it works

1. The plugin intercepts module resolution during the Vite build process
2. For npm package names (e.g., `@scope/package` or `package-name`), it uses oxc-resolver to find the source version
3. If a source file is found and matches the include/exclude patterns, it returns the path to the source file
4. Otherwise, it falls back to the default resolution

## Environment Variables

- `IMPORT_SOURCE_DEBUG`: Set to enable verbose logging

## Dependencies

- `oxc-resolver`: For advanced module resolution
- `minimatch`: For glob pattern matching
- `vite`: Peer dependency for the plugin interface
