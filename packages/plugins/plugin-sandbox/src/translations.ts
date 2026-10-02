//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Repository, Sandbox } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Repository.Repository)]: {
        'typename.label': 'Repository',
        'typename.label_zero': 'Repositories',
        'typename.label_one': 'Repository',
        'typename.label_other': 'Repositories',
        'object-name.placeholder': 'New repository',
        'add-object.label': 'Add repository',
        'rename-object.label': 'Rename repository',
        'delete-object.label': 'Delete repository',
        'object-deleted.label': 'Repository deleted',
      },
      [Type.getTypename(Sandbox.Sandbox)]: {
        'typename.label': 'Sandbox',
        'typename.label_zero': 'Sandboxes',
        'typename.label_one': 'Sandbox',
        'typename.label_other': 'Sandboxes',
      },
      [meta.profile.key]: {
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
        'terminal-connecting.message': 'Connecting…',
        'terminal-connected.message': 'Connected',
        'terminal-reconnecting.message': 'Reconnecting…',
        'terminal-exited.message': 'Shell exited',
        'repository-empty.message':
          'Nothing has been pushed yet. Push a sandbox directory to this repository to see it here.',
      },
    },
  },
] as const satisfies Resource[];
