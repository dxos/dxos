//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { MARKDOWN_PLUGIN } from './meta';
import { DocumentType } from './types';

export const translations = [
  {
    'en-US': {
      [DocumentType.typename]: {
        'typename label': 'Document',
        'typename label_zero': 'Documents',
        'typename label_one': 'Document',
        'typename label_other': 'Documents',
        'object name placeholder': 'New document',
      },
      [MARKDOWN_PLUGIN]: {
        'plugin name': 'Editor',
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
      },
    },
  },
] as const satisfies Resource[];

export default translations;
