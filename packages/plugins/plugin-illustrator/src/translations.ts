//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { Drawing } from '#types';

import { IllustratorNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Drawing.Drawing)]: {
        'typename.label': 'Drawing',
        'typename.label_zero': 'Drawings',
        'typename.label_one': 'Drawing',
        'typename.label_other': 'Drawings',
        'object-name.placeholder': 'New drawing',
        'add-object.label': 'Add drawing',
        'rename-object.label': 'Rename drawing',
        'delete-object.label': 'Delete drawing',
        'object-deleted.label': 'Drawing deleted',
      },
      [IllustratorNamespace.key]: {
        'plugin.name': 'Illustrator',
        'scores.label': 'Scores',
        'scores.empty.label': 'Nothing to score yet.',
        'create-panel.variant.label': 'Select renderer',
        'create-panel.variant.placeholder': 'Search renderers...',
        'unsupported-variant.label': 'Unsupported drawing variant',
        'edit-in-excalidraw.label': 'Edit in Excalidraw',
        'edit-in-tldraw.label': 'Edit in tldraw',
        'edit-in-canvas.label': 'Edit in Canvas',
        'copy-as-excalidraw.label': 'Copy as Excalidraw',
        'copy-as-tldraw.label': 'Copy as tldraw',
        'copy-as-canvas.label': 'Copy as Canvas',
      },
    },
  },
] as const satisfies Theme.Resource[];
