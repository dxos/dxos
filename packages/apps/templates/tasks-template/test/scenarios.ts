//
// Copyright 2023 DXOS.org
//

import { InputOf } from '@dxos/plate';

import template from '../src/template.t';

export const scenarios: InputOf<typeof template>[] = [
  {
    name: 'max',
    monorepo: false,
    pwa: false,
    dxosUi: false,
    react: true,
    storybook: false,
    tailwind: true,
    createFolder: false,
    proto: true,
  },
];
