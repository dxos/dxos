//
// Copyright 2023 DXOS.org
//

import { join } from 'path';

import { config, packages } from '../../.storybook/main';

const contentFiles = '/**/*.{mdx,stories.jsx,stories.tsx}';
const stories = [
  '/apps/*/src/**',
  '/devtools/*/src/**',
  '/experimental/*/src/**',
  '/plugins/*/src/**',
  '/sdk/*/src/**',
  '/ui/*/src/**',
];

export default config({
  stories: stories.map((dir) => join(packages, dir, contentFiles)),
});
