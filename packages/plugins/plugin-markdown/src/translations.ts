//
// Copyright 2023 DXOS.org
//

import { MARKDOWN_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [MARKDOWN_PLUGIN]: {
        'plugin name': 'Editor',
        'create stack section label': 'Create document',
        'document title placeholder': 'New document',
        'choose markdown from space dialog title': 'Choose one or more documents to add',
        // TODO(burdon): Style-guide for user-facing text (e.g., hints, questions, capitalization, etc.)
        'empty choose markdown from space message': 'None available; try creating a new one instead?',
        'chooser done label': 'Add selected',
        'create document label': 'Create document',
        'editor placeholder': 'New document',
        'editor input mode label': 'Editor input mode',
        'select editor input mode placeholder': 'Select editor input mode…',
        'settings editor input mode default label': 'Default',
        'settings editor input mode vim label': 'Vim',
        'settings editor input mode vscode label': 'VS Code',
        'settings toolbar label': 'Show toolbar',
        'settings numbered headings': 'Numbered headings',
        'settings experimental label': 'Enable experimental features',
        'settings debug label': 'Enable debugging features',
        'settings debug placeholder': 'Typewriter script...',
        'toggle view mode label': 'Toggle read-only',
        'default view mode label': 'Default view mode',
      },
    },
  },
];
