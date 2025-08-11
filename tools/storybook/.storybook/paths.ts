//
// Copyright 2025 DXOS.org
//

import { join, resolve } from 'node:path';

const baseDir = resolve(__dirname, '../');
const rootDir = resolve(baseDir, '../../');
export const staticDir = resolve(baseDir, './static');
export const iconsDir = resolve(rootDir, 'node_modules/@phosphor-icons/core/assets');

export const packages = resolve(rootDir, 'packages');
export const storyFiles = '*.{mdx,stories.tsx}';
export const contentFiles = '*.{ts,tsx,js,jsx,css}';
export const modules = [
  'apps/*/src/**',
  'common/*/src/**',
  'devtools/*/src/**',
  'experimental/*/src/**',
  'plugins/*/src/**',
  'sdk/*/src/**',
  'ui/*/src/**',
];

export const stories = modules.map((dir) => join(packages, dir, storyFiles));
export const content = modules.map((dir) => join(packages, dir, contentFiles));
