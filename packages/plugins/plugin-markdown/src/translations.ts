//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Markdown } from './types';

export const translations = [
  {
    'en-US': {
      [Markdown.Document.typename]: {
        'typename label': 'Document',
        'typename label_zero': 'Documents',
        'typename label_one': 'Document',
        'typename label_other': 'Documents',
        'object name placeholder': 'New document',
        'rename object label': 'Rename document',
        'delete object label': 'Delete document',
      },
      [meta.id]: {
        'plugin name': 'Editor',
        'settings title': 'Editor settings',
        'choose markdown from space dialog title': 'Choose one or more documents to add',
        // TODO(burdon): Style-guide for user-facing text (e.g., hints, questions, capitalization, etc.)
        'empty choose markdown from space message': 'None available; try creating a new one instead?',
        'chooser done label': 'Add selected',
        'editor placeholder': '',
        'editor input mode label': 'Editor input mode',
        'select editor input mode placeholder': 'Select editor input mode…',
        'settings editor input mode default label': 'Default',
        'settings editor input mode vim label': 'Vim',
        'settings editor input mode vscode label': 'VS Code',
        'settings toolbar label': 'Show toolbar',
        'settings numbered headings label': 'Numbered headings',
        'settings folding label': 'Folding',
        'settings experimental label': 'Enable experimental features',
        'settings debug label': 'Enable debugging features',
        'settings debug placeholder': 'Typewriter script...',
        'toggle view mode label': 'Toggle read-only',
        'default view mode label': 'Default view mode',
        'upload image label': 'Upload image',
        'fallback title': 'Untitled',
        'navigate to document label': 'Open document',
        'words label_zero': 'words',
        'words label_one': 'word',
        'words label_other': 'words',
      },
    },
  },
] as const satisfies Resource[];
