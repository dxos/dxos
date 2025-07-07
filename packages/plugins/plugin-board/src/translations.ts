//
// Copyright 2023 DXOS.org
//

import { type Resource } from 'i18next';

import { BOARD_PLUGIN } from './meta';

export const translations: Resource[] = [
  {
    'en-US': {
      [BOARD_PLUGIN]: {
        'plugin name': 'Board',
      },
    },
  },
] as const;

export default translations;
