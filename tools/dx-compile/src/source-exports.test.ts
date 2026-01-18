//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type ConditionMap,
  type SourceExports,
  type SourceImports,
  generateRuntimeExports,
  generateRuntimeImports,
  getEntrypointsForPlatform,
  getEntrypointsFromSourceExports,
  resolveCondition,
  sourcePathToDist,
  validateSourceImportsKeys,
} from './source-exports';

describe('resolveCondition', () => {
  const conditionMap: ConditionMap = {
    default: './src/index.ts',
    node: './src/node.ts',
    browser: './src/browser.ts',
    workerd: './src/workerd.ts',
  };

  test('resolves node condition', ({ expect }) => {
    expect(resolveCondition(conditionMap, 'node')).toBe('./src/node.ts');
  });

  test('resolves browser condition', ({ expect }) => {
    expect(resolveCondition(conditionMap, 'browser')).toBe('./src/browser.ts');
  });

  test('resolves workerd condition', ({ expect }) => {
    expect(resolveCondition(conditionMap, 'workerd')).toBe('./src/workerd.ts');
  });

  test('falls back to default for node when node not specified', ({ expect }) => {
    const map: ConditionMap = { default: './src/index.ts' };
    expect(resolveCondition(map, 'node')).toBe('./src/index.ts');
  });

  test('falls back browser -> default for browser', ({ expect }) => {
    const map: ConditionMap = { default: './src/index.ts' };
    expect(resolveCondition(map, 'browser')).toBe('./src/index.ts');
  });

  test('falls back workerd -> browser -> default', ({ expect }) => {
    const mapWithBrowser: ConditionMap = { default: './src/index.ts', browser: './src/browser.ts' };
    expect(resolveCondition(mapWithBrowser, 'workerd')).toBe('./src/browser.ts');

    const mapDefault: ConditionMap = { default: './src/index.ts' };
    expect(resolveCondition(mapDefault, 'workerd')).toBe('./src/index.ts');
  });
});

describe('getEntrypointsFromSourceExports', () => {
  test('extracts unique entrypoints from all conditions', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
        node: './src/node.ts',
        browser: './src/browser.ts',
      },
      './util': {
        default: './src/util/index.ts',
      },
    };

    const entrypoints = getEntrypointsFromSourceExports(sourceExports);
    expect(entrypoints).toHaveLength(4);
    expect(entrypoints).toContain('./src/index.ts');
    expect(entrypoints).toContain('./src/node.ts');
    expect(entrypoints).toContain('./src/browser.ts');
    expect(entrypoints).toContain('./src/util/index.ts');
  });

  test('deduplicates shared source paths', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
        browser: './src/index.ts',
      },
      './util': {
        default: './src/index.ts',
      },
    };

    const entrypoints = getEntrypointsFromSourceExports(sourceExports);
    expect(entrypoints).toHaveLength(1);
    expect(entrypoints).toContain('./src/index.ts');
  });
});

describe('getEntrypointsForPlatform', () => {
  test('extracts entrypoints for browser platform', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
        browser: './src/browser.ts',
      },
      './util': {
        default: './src/util/index.ts',
      },
    };

    const entrypoints = getEntrypointsForPlatform(sourceExports, 'browser');
    expect(entrypoints).toHaveLength(2);
    expect(entrypoints).toContain('./src/browser.ts');
    expect(entrypoints).toContain('./src/util/index.ts');
  });

  test('extracts entrypoints for node platform', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
        node: './src/node.ts',
      },
    };

    const entrypoints = getEntrypointsForPlatform(sourceExports, 'node');
    expect(entrypoints).toContain('./src/node.ts');
  });
});

describe('validateSourceImportsKeys', () => {
  test('returns empty array for valid keys', ({ expect }) => {
    const sourceImports: SourceImports = {
      '#util': { default: 'node:util' },
      '#internal': { default: './src/internal.ts' },
    };

    expect(validateSourceImportsKeys(sourceImports)).toEqual([]);
  });

  test('returns invalid keys that do not start with #', ({ expect }) => {
    const sourceImports: SourceImports = {
      '#valid': { default: 'node:util' },
      'invalid': { default: './src/invalid.ts' },
      './also-invalid': { default: './src/also-invalid.ts' },
    };

    const invalidKeys = validateSourceImportsKeys(sourceImports);
    expect(invalidKeys).toHaveLength(2);
    expect(invalidKeys).toContain('invalid');
    expect(invalidKeys).toContain('./also-invalid');
  });
});

describe('sourcePathToDist', () => {
  test('converts source path to dist path', ({ expect }) => {
    expect(sourcePathToDist('./src/index.ts', 'dist/lib/browser', '.mjs')).toBe('./dist/lib/browser/index.mjs');
  });

  test('handles nested paths', ({ expect }) => {
    expect(sourcePathToDist('./src/util/helpers.ts', 'dist/lib/browser', '.mjs')).toBe(
      './dist/lib/browser/util/helpers.mjs',
    );
  });

  test('handles tsx files', ({ expect }) => {
    expect(sourcePathToDist('./src/Component.tsx', 'dist/lib/browser', '.mjs')).toBe(
      './dist/lib/browser/Component.mjs',
    );
  });

  test('handles paths without ./ prefix', ({ expect }) => {
    expect(sourcePathToDist('src/index.ts', 'dist/lib/browser', '.mjs')).toBe('./dist/lib/browser/index.mjs');
  });
});

describe('generateRuntimeExports', () => {
  test('generates runtime exports for browser and node platforms', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
      },
    };

    const exports = generateRuntimeExports(sourceExports, ['browser', 'node']);
    expect(exports['.']).toEqual({
      types: './dist/types/index.d.ts',
      browser: './dist/lib/browser/index.mjs',
      node: './dist/lib/node-esm/index.mjs',
    });
  });

  test('handles platform-specific source files', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': {
        default: './src/index.ts',
        browser: './src/browser.ts',
        node: './src/node.ts',
      },
    };

    const exports = generateRuntimeExports(sourceExports, ['browser', 'node']);
    expect(exports['.']).toEqual({
      types: './dist/types/index.d.ts',
      browser: './dist/lib/browser/browser.mjs',
      node: './dist/lib/node-esm/node.mjs',
    });
  });

  test('handles multiple subpaths', ({ expect }) => {
    const sourceExports: SourceExports = {
      '.': { default: './src/index.ts' },
      './util': { default: './src/util/index.ts' },
    };

    const exports = generateRuntimeExports(sourceExports, ['browser']);
    expect(exports['.']).toBeDefined();
    expect(exports['./util']).toBeDefined();
    expect(exports['./util'].browser).toBe('./dist/lib/browser/util/index.mjs');
  });
});

describe('generateRuntimeImports', () => {
  test('keeps external specifiers as-is', ({ expect }) => {
    const sourceImports: SourceImports = {
      '#util': {
        node: 'node:util',
        browser: '@acme/polyfills/util',
        default: '@acme/polyfills/util',
      },
    };

    const imports = generateRuntimeImports(sourceImports, ['browser', 'node']);
    expect(imports['#util']).toEqual({
      node: 'node:util',
      browser: '@acme/polyfills/util',
      default: '@acme/polyfills/util',
    });
  });

  test('maps local source files to dist paths', ({ expect }) => {
    const sourceImports: SourceImports = {
      '#internal': {
        default: './src/internal/entry.ts',
        browser: './src/internal/browser.ts',
      },
    };

    const imports = generateRuntimeImports(sourceImports, ['browser', 'node']);
    expect(imports['#internal'].default).toBe('./dist/lib/browser/internal/entry.mjs');
    expect(imports['#internal'].browser).toBe('./dist/lib/browser/internal/browser.mjs');
  });
});
