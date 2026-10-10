//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/dxos-subpath-entrypoints.js';

// The rule reads the exports map of the package containing the linted file, so each case lints a
// fixture package's root barrel.
const fixture = (pkg: string, file = 'src/index.ts') =>
  new URL(`./__fixtures__/${pkg}/${file}`, import.meta.url).pathname;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

const code = "export * as Alpha from './Alpha';";

describe('dxos-subpath-entrypoints', () => {
  it('rejects entry points that are not namespaces', () => {
    ruleTester.run('dxos-subpath-entrypoints', rule, {
      valid: [
        // A package with no namespace subpaths has not migrated, so its entry points are its API.
        { filename: fixture('subpath-unmigrated'), code },
        // Only the root barrel carries the contract.
        { filename: fixture('subpath-entrypoints', 'src/Alpha.ts'), code: 'export const alpha = 1;' },
      ],
      invalid: [
        {
          // `./plugin`, `./testing` and below, `./translations`, `./package.json` and assets are conventions.
          filename: fixture('subpath-entrypoints'),
          code,
          errors: [
            { messageId: 'customEntrypoint', data: { key: './components', pkg: '@fixture/subpath-entrypoints' } },
          ],
        },
      ],
    });
  });
});
