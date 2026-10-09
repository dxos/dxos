//
// Copyright 2026 DXOS.org
//

import { readdirSync } from 'node:fs';
import { join } from 'node:path';

const packagesDir = join(import.meta.dirname, 'packages');

/**
 * React Compiler options for `@vitejs/plugin-react`, shared by composer-app and Storybook so stories
 * render the same compiled components the app does. `sources` covers every workspace root except
 * `react-ui`, whose primitives ship whole in the boot graph (an import-map shared package) where
 * compiled caches cost ~75 KB and rarely hit. Scoped here rather than by `exclude` so those
 * primitives keep Fast Refresh.
 */
export const reactCompilerOptions = {
  sources: readdirSync(packagesDir).flatMap((group) =>
    group === 'ui'
      ? readdirSync(join(packagesDir, 'ui'))
          .filter((name) => name !== 'react-ui')
          .map((name) => `/packages/ui/${name}/`)
      : [`/packages/${group}/`],
  ),
};
