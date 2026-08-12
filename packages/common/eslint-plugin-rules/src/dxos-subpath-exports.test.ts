//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/dxos-subpath-exports.js';

// The rule reads the real exports map of the package containing the linted file, so each fixture is
// a package on disk. Only the root barrel's own text comes from `code`; nested barrels are read
// from the fixture, which is what lets a test exercise re-export chains.
const fixture = (pkg: string) => new URL(`./__fixtures__/${pkg}/src/index.ts`, import.meta.url).pathname;

const filename = fixture('subpath-plugin');

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('dxos-subpath-exports', () => {
  it('accepts a barrel that matches its exports map', () => {
    ruleTester.run('dxos-subpath-exports', rule, {
      valid: [
        // Every declared subpath re-exported directly from the root barrel.
        {
          filename,
          code: [
            "export * from './meta';",
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
        },
        // The same namespaces reached through a nested barrel: nesting is structure, not contract.
        { filename, code: "export * from './meta';\nexport * from './types';" },
        // A namespace declared at the root shadows the one the nested barrel provides.
        {
          filename,
          code: "export * from './types';\nexport * as Alpha from './types/Alpha';",
        },
        // Lowercase names are module entrypoints, not namespaces, so they carry no subpath.
        {
          filename,
          code: "export * from './types';\nexport * as helpers from './meta';",
        },
        // A package with no per-namespace subpaths has not migrated; its barrel is still its API.
        { filename: fixture('subpath-unmigrated'), code: "export * as Whatever from './types/Whatever';" },
        // A subpath onto a module that does not declare itself a namespace is a standalone
        // entrypoint; hoisting it onto the barrel would put it in every consumer's graph.
        { filename: fixture('subpath-alias'), code: "export const value = 'standalone';" },
        // Files that are not the package's root barrel are none of this rule's business.
        {
          filename: new URL('./__fixtures__/subpath-plugin/src/types/index.ts', import.meta.url).pathname,
          code: "export * as Alpha from './Alpha';",
        },
      ],
      invalid: [
        {
          // A declared subpath missing from the barrel, inserted among its sorted siblings.
          code: [
            "export * from './meta';",
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
          ].join('\n'),
          filename,
          output: [
            "export * from './meta';",
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          errors: [{ messageId: 'missingNamespaceExport' }],
        },
        {
          // Sorted insertion also runs backwards, ahead of the first later sibling.
          code: [
            "export * from './meta';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          filename,
          output: [
            "export * from './meta';",
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          errors: [{ messageId: 'missingNamespaceExport' }],
        },
        {
          // Nothing to sort against: the namespace lands at the end of the barrel. The three
          // insertions share an anchor, so a pass applies one and the rest follow on re-runs.
          code: "export * from './meta';",
          filename,
          output: "export * from './meta';\nexport * as Alpha from './types/Alpha';",
          errors: [
            { messageId: 'missingNamespaceExport' },
            { messageId: 'missingNamespaceExport' },
            { messageId: 'missingNamespaceExport' },
          ],
        },
        {
          // Right name, wrong module — a consumer rewritten to `/Beta` would get another module.
          code: [
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Gamma';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          filename,
          errors: [{ messageId: 'namespaceTargetMismatch' }],
        },
        {
          // A type-only re-export does not satisfy a value entrypoint.
          code: [
            "export type * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          filename,
          errors: [{ messageId: 'typeOnlyNamespaceExport' }],
        },
        {
          // Exported from the barrel but unreachable by subpath, so importing it costs the package.
          code: "export * from './types';\nexport * as Undeclared from './types/Undeclared';",
          filename,
          errors: [{ messageId: 'undeclaredNamespace' }],
        },
        {
          // Two paths to one name resolve to distinct bindings, so ES drops it from the barrel.
          // The report lands on the `export *` that reaches it, since no node here names it.
          code: "export * from './types';\nexport * from './alt';",
          filename,
          errors: [{ messageId: 'ambiguousNamespace' }],
        },
        {
          // Only package-internal modules may be star-exported.
          code: "export * from './types';\nexport * from '@dxos/echo';",
          filename,
          errors: [{ messageId: 'externalStarExport' }],
        },
        {
          // The root entry carries types and operations; the plugin lives on its own subpath.
          code: "export * from './types';\nexport * from './plugin';",
          filename,
          errors: [{ messageId: 'pluginInstanceExported' }],
        },
        {
          // A namespace reached only through a nested barrel is still held to the contract.
          code: "export * from './types';\nexport * from './nested';",
          filename,
          errors: [{ messageId: 'undeclaredNamespace' }],
        },
      ],
    });
  });
});
