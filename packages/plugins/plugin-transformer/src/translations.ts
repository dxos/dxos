//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { TRANSFORMER_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [TRANSFORMER_PLUGIN]: {
        'plugin name': 'Transformers',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
