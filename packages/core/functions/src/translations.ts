//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

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
] as const satisfies Resource[];

export default translations;
