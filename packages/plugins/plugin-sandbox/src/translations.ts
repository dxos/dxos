//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import type * as Theme from '@dxos/react-ui/Theme';

import { Sandbox } from '#types';

import { SandboxNamespace } from './namespace.ts';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Sandbox.Sandbox)]: {
        'typename.label': 'Sandbox',
        'typename.label_zero': 'Sandboxes',
        'typename.label_one': 'Sandbox',
        'typename.label_other': 'Sandboxes',
      },
      [SandboxNamespace.key]: {
        'plugin.name': 'Sandbox',
        'branch-select.placeholder': 'Branch',
        'show-history.button': 'History',
        'show-files.button': 'Files',
        'refresh.button': 'Refresh',
        'files-tree.label': 'Files',
        'files-pane.label': 'Files',
        'file-pane.label': 'File',
        'history.label': 'Commits',
        'history-empty.message': 'No commits.',
        'history-more.button': 'Load more',
        'no-file-selected.message': 'Select a file',
        'binary-file.message': 'Binary file ({{size}} bytes).',
        'repository-empty.message':
          'Nothing has been pushed yet. Push a sandbox directory to this repository to see it here.',
      },
    },
  },
] as const satisfies Theme.Resource[];
