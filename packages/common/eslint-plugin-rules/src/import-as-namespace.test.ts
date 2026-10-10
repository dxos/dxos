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

  // `@dxos/plugin-chess/PlayerReview` is a real namespace module the package can resolve.
  it('names a package-subpath namespace by its module, prefixing the package only on a clash', () => {
    const source = '@dxos/plugin-chess/PlayerReview';
    ruleTester.run('import-as-namespace', rule, {
      valid: [
        { filename, code: `import * as PlayerReview from '${source}';` },
        { filename, code: `import * as ChessPlayerReview from '${source}';\nconst PlayerReview = 1;` },
        // `./Chess` carries no directive, so it is not a namespace module.
        { filename, code: "import { Chess } from '@dxos/plugin-chess/Chess';" },
      ],
      invalid: [
        {
          filename,
          code: `import * as Review from '${source}';\nReview.make();`,
          output: `import * as PlayerReview from '${source}';\nPlayerReview.make();`,
          errors: [{ messageId: 'packageNamespaceAlias' }],
        },
        {
          filename,
          code: `import * as ChessPlayerReview from '${source}';\nChessPlayerReview.make();`,
          output: `import * as PlayerReview from '${source}';\nPlayerReview.make();`,
          errors: [{ messageId: 'packageNamespaceAlias' }],
        },
        {
          filename,
          code: `import { make as makeReview } from '${source}';\nmakeReview({ makeReview });`,
          output: `import * as PlayerReview from '${source}';\nPlayerReview.make({ makeReview: PlayerReview.make });`,
          errors: [{ messageId: 'mustUseNamespaceImport' }],
        },
      ],
    });
  });
});
