//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Journal, Outline } from './types';

export const translations = [
  {
    'en-US': {
      [Journal.Journal.typename]: {
        'typename label': 'Journal',
        'typename label_zero': 'Journals',
        'typename label_one': 'Journal',
        'typename label_other': 'Journals',
        'object name placeholder': 'New journal',
        'rename object label': 'Rename journal',
        'delete object label': 'Delete journal',
        'object deleted label': 'Journal deleted',
      },
      [Outline.Outline.typename]: {
        'typename label': 'Outline',
        'typename label_zero': 'Outlines',
        'typename label_one': 'Outline',
        'typename label_other': 'Outlines',
        'object name placeholder': 'New outline',
        'rename object label': 'Rename outline',
        'delete object label': 'Delete outline',
        'object deleted label': 'Outline deleted',
      },
      [meta.id]: {
        'plugin name': 'Outliner',
        'delete object label': 'Delete object',
        'create outline label': 'Create outline',
        'create entry label': 'Create entry',
        'text placeholder': 'Enter text...',
        'menu label': 'Menu',

        'meeting notes label': 'Notes',
        'today label': 'Today',

        // TODO(burdon): Move to plugin-task.
        'task action': 'Convert to task',
        'delete row': 'Delete row',
      },
    },
  },
] as const satisfies Resource[];
