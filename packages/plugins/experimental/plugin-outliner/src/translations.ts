//
// Copyright 2023 DXOS.org
//

import { OUTLINER_PLUGIN } from './meta';
import { JournalType, TreeType } from './types';

export default [
  {
    'en-US': {
      [JournalType.typename]: {
        'typename label': 'Journal',
      },
      [TreeType.typename]: {
        'typename label': 'Outline',
      },
      [OUTLINER_PLUGIN]: {
        'plugin name': 'Outliner',
        'journal object placeholder': 'New journal',
        'outline object placeholder': 'New outline',
        'delete object label': 'Delete item',
      },
    },
  },
];
