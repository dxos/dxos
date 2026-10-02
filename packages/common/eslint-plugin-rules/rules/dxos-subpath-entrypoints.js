//
// Copyright 2026 DXOS.org
//

import path from 'node:path';

import { findPackage, isNamespaceName, sourceOf } from './dxos-subpath-exports.js';

/**
 * Entry points every package may declare beside its namespaces: each is a repo-wide convention with
 * a consumer that expects the name (the plugin loader, the i18n loader, test harnesses, build
 * tooling), not part of the package's API surface.
 */
const CONVENTIONAL_ENTRYPOINTS = new Set([
  '.',
  './package.json',
  './plugin',
  './testing',
  './translations',
  './vite-plugin',
]);

/**
 * Whether an entry point is conventional. Test-only entry points may be split (`./testing/react`)
 * since they never reach a production graph, and asset files carry no import graph at all.
 */
const isConventional = (key, packageName) =>
  CONVENTIONAL_ENTRYPOINTS.has(key) ||
  key.startsWith('./testing/') ||
  key.startsWith('./assets/') ||
  // Storybook loads an addon from these fixed names.
  (packageName.startsWith('@dxos/storybook-addon-') && (key === './manager' || key === './preview'));

/**
 * Entry points that predate this rule and are each a migration of their own.
 *
 * TODO(wittjosiah): Whittle this down to nothing. `echo/internal` should become actually internal;
 *  `app-framework/config` only re-exports `Config2` from `@dxos/protocols`.
 */
const PENDING_ENTRYPOINTS = new Set([
  '@dxos/app-framework/config',
  '@dxos/app-framework/ui',
  '@dxos/app-toolkit/ui',
  '@dxos/echo/internal',
]);

/**
 * ESLint rule rejecting entry points that are not namespaces in a package that has migrated to
 * per-namespace subpaths. A `./components` or `./hooks` entry is a second barrel: whatever imports
 * it gets every module behind it, which is the coupling the namespace subpaths exist to remove.
 *
 * Applies to the same packages as `dxos-subpath-exports` — those declaring at least one PascalCase
 * subpath — and reports on the package's root barrel, since the exports map itself is not linted.
 */
export default {
  meta: {
    type: 'problem',
    docs: {
      description: 'reject non-namespace entry points in packages that use per-namespace subpaths',
    },
    schema: [],
    messages: {
      customEntrypoint:
        'Entry point "{{key}}" of {{pkg}} is not a namespace. Expose its exports as PascalCase namespace subpaths (or on the root barrel) and import them from there.',
    },
  },
  create: (context) => {
    const filename = context.filename ?? context.getFilename();
    return {
      Program: (node) => {
        const pkg = findPackage(filename, new Map());
        const exportsMap = pkg?.json?.exports;
        if (!exportsMap || typeof exportsMap !== 'object') {
          return;
        }
        const rootSource = sourceOf(exportsMap['.'], pkg.dir);
        if (!rootSource || path.resolve(pkg.dir, rootSource) !== path.resolve(filename)) {
          return;
        }

        const keys = Object.keys(exportsMap);
        const isNamespaceKey = (key) =>
          key.startsWith('./') && !key.slice(2).includes('/') && isNamespaceName(key.slice(2));
        if (!keys.some(isNamespaceKey)) {
          return;
        }

        for (const key of keys) {
          if (
            isNamespaceKey(key) ||
            isConventional(key, pkg.json.name) ||
            PENDING_ENTRYPOINTS.has(`${pkg.json.name}${key.slice(1)}`)
          ) {
            continue;
          }
          context.report({ node, messageId: 'customEntrypoint', data: { key, pkg: pkg.json.name } });
        }
      },
    };
  },
};
