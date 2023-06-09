//
// Copyright 2023 DXOS.org
//

import { ExtractInput } from '@dxos/plate';

import config from '../src/config.t';

export const configs: ExtractInput<typeof config>[] = [
  {
    name: 'tasks',
    dxosUi: true,
    monorepo: false,
    pwa: false,
    react: true,
    storybook: false,
    tailwind: true,
  },
];
