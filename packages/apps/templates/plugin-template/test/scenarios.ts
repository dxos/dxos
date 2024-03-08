//
// Copyright 2023 DXOS.org
//

import { type InputOf } from '@dxos/plate';

import type template from '../src/template.t';

export const scenarios: InputOf<typeof template>[] = [
  {
    name: 'default',
    createFolder: true,
    defaultPlugins: true,
  },
  {
    name: 'default-bare',
    createFolder: true,
    defaultPlugins: false,
  },
];
