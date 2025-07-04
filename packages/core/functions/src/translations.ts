//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';

import { ScriptType } from './schema';

export default [
  {
    'en-US': {
      [Type.getTypename(ScriptType)]: {
        'typename label': 'Script',
        'typename label_zero': 'Scripts',
        'typename label_one': 'Script',
        'typename label_other': 'Scripts',
      },
    },
  },
];
