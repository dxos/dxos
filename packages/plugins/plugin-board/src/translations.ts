//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { BOARD_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [BOARD_PLUGIN]: {
        'plugin name': 'Board',
      },
    },
  },
] as const satisfies Resource[];

export default translations;
