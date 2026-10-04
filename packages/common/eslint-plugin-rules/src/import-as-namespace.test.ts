//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/import-as-namespace.js';

// The rule reads the imported module's directive from disk, so the linted file sits beside a fixture
// namespace module.
const filename = new URL('./__fixtures__/namespace-alias/consumer.ts', import.meta.url).pathname;

const ruleTester = new RuleTester({
  languageOptions: { ecmaVersion: 2022, sourceType: 'module', parser: await import('@typescript-eslint/parser') },
});

describe('import-as-namespace', () => {
  it('accepts the filename, a Module suffix, or a PascalCase prefix', () => {
    ruleTester.run('import-as-namespace', rule, {
      valid: [
        { filename, code: "import * as Hooks from './Hooks.ts';" },
        { filename, code: "import * as HooksModule from './Hooks.ts';" },
        { filename, code: "import * as ToolkitHooks from './Hooks.ts';" },
      ],
      invalid: [
        {
          filename,
          code: "import * as appHooks from './Hooks.ts';",
          output: "import * as Hooks from './Hooks.ts';",
          errors: [{ messageId: 'namespaceMustMatchFilename' }],
        },
        {
          filename,
          code: "import * as HooksApp from './Hooks.ts';",
          output: "import * as Hooks from './Hooks.ts';",
          errors: [{ messageId: 'namespaceMustMatchFilename' }],
        },
      ],
    });
  });
});
