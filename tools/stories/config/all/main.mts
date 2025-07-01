//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/main';

const dirs = [
  '/apps/*/src/**',
  '/devtools/*/src/**',
  '/experimental/*/src/**',
  '/plugins/*/src/**',
  '/sdk/*/src/**',
  '/ui/*/src/**',
];

export default config({
  stories: dirs.flatMap((dir) => [
    // Docs.
    join(packages, dir, '/**/*.mdx'),
    // Stories.
    join(packages, dir, '/**/*.stories.{jsx,tsx}'),
  ]),
});
