//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/main';

const contentFiles = '/**/*.{mdx,stories.jsx,stories.tsx}';

const dirs = [
  '/apps/*/src/**',
  '/devtools/*/src/**',
  '/experimental/*/src/**',
  '/plugins/*/src/**',
  '/sdk/*/src/**',
  '/ui/*/src/**',
];

export default config({
  stories: dirs.map((dir) => join(packages, dir, contentFiles)),
});
