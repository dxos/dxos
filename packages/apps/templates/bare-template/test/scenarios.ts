//
// Copyright 2023 DXOS.org
//

import { InputOf } from '@dxos/plate';

import template from '../src/template.t';

export const scenarios: InputOf<typeof template>[] = [
  {
    name: 'min',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: false,
    storybook: false,
    tailwind: false,
    createFolder: false,
  },
  {
    name: 'pwa',
    monorepo: true,
    pwa: true,
    dxosUi: false,
    react: false,
    storybook: false,
    tailwind: false,
    createFolder: false,
  },
  {
    name: 'dxosui',
    monorepo: true,
    pwa: false,
    dxosUi: true,
    react: true,
    storybook: false,
    tailwind: true,
    createFolder: false,
  },
  {
    name: 'react',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: false,
    createFolder: false,
  },
  {
    name: 'storybook',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: true,
    tailwind: false,
    createFolder: false,
  },
  {
    name: 'tailwind',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: false,
    storybook: false,
    tailwind: true,
    createFolder: false,
  },
  {
    name: 'react-tailwind',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: true,
    createFolder: false,
  },
  {
    name: 'max',
    monorepo: true,
    pwa: true,
    dxosUi: true,
    react: true,
    storybook: true,
    tailwind: true,
    createFolder: false,
  },
];
