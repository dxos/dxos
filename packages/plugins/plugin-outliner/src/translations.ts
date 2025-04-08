//
// Copyright 2023 DXOS.org
//

import { OUTLINER_PLUGIN } from './meta';
import { JournalType, OutlineType } from './types';

export default [
  {
    'en-US': {
      [JournalType.typename]: {
        'typename label': 'Journal',
        'object name placeholder': 'New journal',
      },
      [OutlineType.typename]: {
        'typename label': 'Outline',
        'object name placeholder': 'New outline',
      },
      [OUTLINER_PLUGIN]: {
        'plugin name': 'Outliner',
        'delete object label': 'Delete item',
        'create entry label': 'Create entry',
        'text placeholder': 'Enter text...',
        'menu label': 'Menu',

        // TODO(burdon): Move to plugin-task.
        'task action': 'Convert to task',
      },
    },
  },
];
