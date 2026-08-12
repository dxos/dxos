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

// `subpath-plugin` keeps its namespaces beside the barrel so a root re-export is single-segment;
// `subpath-nested` satisfies the same exports map a directory down.
const filename = fixture('subpath-plugin');
const nested = fixture('subpath-nested');

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
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
          ].join('\n'),
        },
        // The same namespaces reached through a nested barrel: nesting is structure, not contract.
        { filename: nested, code: "export * from './types';" },
        // A namespace declared at the root shadows the one the nested barrel provides.
        {
          filename,
          code: "export * as Alpha from './Alpha';\nexport * from './meta';\nexport * as Beta from './Beta';\nexport * as Gamma from './Gamma';",
        },
        // Lowercase names are module entrypoints, not namespaces, so they carry no subpath.
        {
          filename,
          code: [
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
            "export * as helpers from './meta';",
          ].join('\n'),
        },
        // A narrow named re-export stays: a star over the directory barrel would export more than
        // it names, and in some packages something else entirely.
        { filename: nested, code: "export * from './types';\nexport { value } from './types/Undeclared';" },
        // A package with no per-namespace subpaths has not migrated; its barrel is still its API.
        { filename: fixture('subpath-unmigrated'), code: "export * as Whatever from './types/Whatever';" },
        // A subpath onto a module that does not declare itself a namespace is a standalone
        // entrypoint; hoisting it onto the barrel would put it in every consumer's graph.
        { filename: fixture('subpath-alias'), code: "export const value = 'standalone';" },
        // Files that are not the package's root barrel are none of this rule's business.
        {
          filename: new URL('./__fixtures__/subpath-nested/src/types/index.ts', import.meta.url).pathname,
          code: "export * as Alpha from './Alpha';",
        },
      ],
      invalid: [
        {
          // A declared subpath missing from the barrel, inserted among its sorted siblings.
          code: "export * from './meta';\nexport * as Alpha from './Alpha';\nexport * as Beta from './Beta';",
          filename,
          output: [
            "export * from './meta';",
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
          ].join('\n'),
          errors: [{ messageId: 'missingNamespaceExport' }],
        },
        {
          // Sorted insertion also runs backwards, ahead of the first later sibling.
          code: "export * from './meta';\nexport * as Beta from './Beta';\nexport * as Gamma from './Gamma';",
          filename,
          output: [
            "export * from './meta';",
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
          ].join('\n'),
          errors: [{ messageId: 'missingNamespaceExport' }],
        },
        {
          // Nothing to sort against: the namespace lands at the end of the barrel. The three
          // insertions share an anchor, so a pass applies one and the rest follow on re-runs.
          code: "export * from './meta';",
          filename,
          output: "export * from './meta';\nexport * as Alpha from './Alpha';",
          errors: [
            { messageId: 'missingNamespaceExport' },
            { messageId: 'missingNamespaceExport' },
            { messageId: 'missingNamespaceExport' },
          ],
        },
        {
          // Right name, wrong module — a consumer rewritten to `/Beta` would get another module.
          code: "export * as Alpha from './Alpha';\nexport * as Beta from './Gamma';\nexport * as Gamma from './Gamma';",
          filename,
          errors: [{ messageId: 'namespaceTargetMismatch' }],
        },
        {
          // A type-only re-export does not satisfy a value entrypoint.
          code: "export type * as Alpha from './Alpha';\nexport * as Beta from './Beta';\nexport * as Gamma from './Gamma';",
          filename,
          errors: [{ messageId: 'typeOnlyNamespaceExport' }],
        },
        {
          // Exported from the barrel but unreachable by subpath, so importing it costs the package.
          code: [
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
            "export * as Undeclared from './Undeclared';",
          ].join('\n'),
          filename,
          errors: [{ messageId: 'undeclaredNamespace' }],
        },
        {
          // A namespace reached only through a nested barrel is still held to the contract, and
          // reports on the `export *` that reaches it, since no node here names it.
          code: "export * from './types';\nexport * from './nested';",
          filename: nested,
          errors: [{ messageId: 'undeclaredNamespace' }],
        },
        {
          // Two paths to one name resolve to distinct bindings, so ES drops it from the barrel.
          code: "export * from './types';\nexport * from './alt';",
          filename: nested,
          errors: [{ messageId: 'ambiguousNamespace' }],
        },
        {
          // Only package-internal modules may be star-exported.
          code: [
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
            "export * from '@dxos/echo';",
          ].join('\n'),
          filename,
          errors: [{ messageId: 'externalStarExport' }],
        },
        {
          // The root entry carries types and operations; the plugin lives on its own subpath.
          code: [
            "export * as Alpha from './Alpha';",
            "export * as Beta from './Beta';",
            "export * as Gamma from './Gamma';",
            "export * from './plugin';",
          ].join('\n'),
          filename,
          errors: [{ messageId: 'pluginInstanceExported' }],
        },
        {
          // Reaching a directory down grows the root barrel a line per module; the directory's
          // own barrel says the same thing in one line.
          code: [
            "export * as Alpha from './types/Alpha';",
            "export * as Beta from './types/Beta';",
            "export * as Gamma from './types/Gamma';",
          ].join('\n'),
          filename: nested,
          errors: [
            { messageId: 'nestedPathExport' },
            { messageId: 'nestedPathExport' },
            { messageId: 'nestedPathExport' },
          ],
        },
      ],
    });
  });
});
