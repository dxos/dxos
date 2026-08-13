//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/dxos-package-imports.js';

// The alias map is read from the fixture package's own manifest, so the linted file has to sit
// inside it on disk. `#hooks` and `#meta` are plain; `#plugin` is conditional.
const file = (rel: string) => new URL(`./__fixtures__/package-imports/src/${rel}`, import.meta.url).pathname;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('dxos-package-imports', () => {
  it('requires a declared alias over a relative path to the same file', () => {
    ruleTester.run('dxos-package-imports', rule, {
      valid: [
        // Already using the alias.
        { filename: file('nested/consumer.ts'), code: "import { meta } from '#meta';" },
        // A relative path to a module no alias names.
        { filename: file('nested/consumer.ts'), code: "import { useThing } from '../hooks/useThing';" },
        // The barrel building itself: `#hooks` points here, and the members it re-exports have no
        // alias of their own.
        { filename: file('hooks/index.ts'), code: "export * from './useThing';" },
        // A module the barrel imports would otherwise import its own importer.
        { filename: file('hooks/useThing.ts'), code: "import { x } from './index';" },
        // Package-external specifiers are none of this rule's business.
        { filename: file('nested/consumer.ts'), code: "import { Obj } from '@dxos/echo';" },
        // One branch of a conditional alias names a different module than the alias would
        // resolve to, so pinning it relatively is a real choice rather than a bypass.
        { filename: file('nested/consumer.ts'), code: "export * from '../plugin';" },
        { filename: file('nested/consumer.ts'), code: "export * from '../plugin.node';" },
      ],
      invalid: [
        {
          // Relative import of a module `#meta` names.
          code: "import { meta } from '../meta';",
          filename: file('nested/consumer.ts'),
          output: "import { meta } from '#meta';",
          errors: [{ messageId: 'useAlias' }],
        },
        {
          // Directory-index form resolves to the same file `#hooks` names.
          code: "import { useThing } from '../hooks';",
          filename: file('nested/consumer.ts'),
          output: "import { useThing } from '#hooks';",
          errors: [{ messageId: 'useAlias' }],
        },
        {
          // Re-exports are held to the same rule as imports.
          code: "export * from '../meta';",
          filename: file('nested/consumer.ts'),
          output: "export * from '#meta';",
          errors: [{ messageId: 'useAlias' }],
        },
      ],
    });
  });
});
