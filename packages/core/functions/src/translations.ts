//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { Type } from '@dxos/echo';

import { ScriptType } from './schema';

export const translations: Resource[] = [
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
] as const;

export default translations;
