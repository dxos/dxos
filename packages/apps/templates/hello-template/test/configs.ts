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
    name: 'complete',
    monorepo: true,
    pwa: true,
    dxosUi: true,
    react: true,
    storybook: true,
    tailwind: true
  }
];
