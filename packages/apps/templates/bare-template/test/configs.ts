import config from '../src/config.t';
import { ExtractInput } from '@dxos/plate';

export const configs: ExtractInput<typeof config>[] = [
  {
    name: 'min',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: false,
    storybook: false,
    tailwind: false
  },
  {
    name: 'pwa',
    monorepo: true,
    pwa: true,
    dxosUi: false,
    react: false,
    storybook: false,
    tailwind: false
  },
  {
    name: 'dxosui',
    monorepo: true,
    pwa: false,
    dxosUi: true,
    react: true,
    storybook: false,
    tailwind: true
  },
  {
    name: 'react',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: false
  },
  {
    name: 'storybook',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: true,
    tailwind: false
  },
  {
    name: 'tailwind',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: true
  },
  {
    name: 'react-tailwind',
    monorepo: true,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: true
  },
  {
    name: 'max',
    monorepo: true,
    pwa: true,
    dxosUi: true,
    react: true,
    storybook: true,
    tailwind: true
  }
];
