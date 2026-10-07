//
// Copyright 2026 DXOS.org
//

import { RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import rule from '../rules/dxos-subpath-imports.js';

// Resolution reads real exports maps through `createRequire(context.getFilename())`, so the
// fixture filename must sit inside the workspace and the package under test must be a real
// dependency-resolvable one. plugin-chess carries per-namespace entries plus the legacy
// aggregate, which is exactly the shape the rule has to distinguish.
const filename = new URL('./fixture.ts', import.meta.url).pathname;

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    parser: await import('@typescript-eslint/parser'),
  },
});

describe('dxos-subpath-imports', () => {
  it('rewrites the /types aggregate to per-namespace subpaths', () => {
    ruleTester.run('dxos-subpath-imports', rule, {
      valid: [
        // Already per-namespace.
        { code: "import * as ChessEvents from '@dxos/plugin-chess/ChessEvents';", filename },
        // Not a participating package.
        { code: "import { foo } from '@dxos/echo';", filename },
        // A subpath that is neither the barrel nor the aggregate is left alone.
        { code: "import { anything } from '@dxos/plugin-chess/translations';", filename },
        // A lowercase exports key is a module entrypoint, not a namespace: rewriting this to
        // `import * as translations from '.../translations'` would bind a different runtime value.
        { code: "import { translations } from '@dxos/plugin-chess';", filename },
        // A default binding alongside named ones: the fix re-emits only named specifiers, so
        // rewriting would delete `Def` and produce code that does not compile.
        { code: "import Def, { Chess } from '@dxos/plugin-chess/types';", filename },
        // Same for a namespace binding.
        { code: "import * as All from '@dxos/plugin-chess/types';", filename },
      ],
      invalid: [
        {
          // All specifiers resolve to namespace entries.
          code: "import { Chess, ChessEvents } from '@dxos/plugin-chess/types';",
          filename,
          output:
            "import * as Chess from '@dxos/plugin-chess/Chess';\nimport * as ChessEvents from '@dxos/plugin-chess/ChessEvents';",
          errors: 1,
        },
        {
          // Unresolvable names stay on the original source rather than being dropped.
          code: "import { Chess, SomeFlatExport } from '@dxos/plugin-chess/types';",
          filename,
          output:
            "import * as Chess from '@dxos/plugin-chess/Chess';\nimport { SomeFlatExport } from '@dxos/plugin-chess/types';",
          errors: 1,
        },
        {
          // Type-only specifiers keep their type-only form.
          code: "import { type Chess } from '@dxos/plugin-chess/types';",
          filename,
          output: "import type * as Chess from '@dxos/plugin-chess/Chess';",
          errors: 1,
        },
      ],
    });
  });
});
