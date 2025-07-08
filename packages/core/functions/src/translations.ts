//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { ScriptType } from './schema';

export const translations = [
  {
    'en-US': {
      [ScriptType.typename]: {
        'typename label': 'Script',
        'typename label_zero': 'Scripts',
        'typename label_one': 'Script',
        'typename label_other': 'Scripts',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
