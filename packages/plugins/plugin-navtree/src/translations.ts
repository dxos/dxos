//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'app-menu.label': 'App menu',
        'open-commands.label': 'Search commands',
        'commands-dialog.title': 'Commands',
        'command-list-input.placeholder': 'Search for commands…',
        'node-actions-menu-invoker.label': 'More options',
        'tree-item-actions.label': 'More actions',
        'button-back.button': 'Back to Space',
        'workspace-unavailable.heading': 'Workspace unavailable',
        'workspace-unavailable.description':
          'You don’t have this workspace, or it no longer exists. Select one of your workspaces to continue.',
      },
    },
  },
] as const satisfies Resource[];
