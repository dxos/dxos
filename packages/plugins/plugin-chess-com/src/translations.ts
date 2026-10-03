//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { ChessComAccount } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(ChessComAccount.Account)]: {
        'typename.label': 'Chess.com account',
        'typename.label_zero': 'Chess.com accounts',
        'typename.label_one': 'Chess.com account',
        'typename.label_other': 'Chess.com accounts',
        'object-name.placeholder': 'Chess.com account',
        'add-object.label': 'Add Chess.com account',
        'rename-object.label': 'Rename Chess.com account',
        'delete-object.label': 'Delete Chess.com account',
        'object-deleted.label': 'Chess.com account deleted',
      },
      [meta.profile.key]: {
        'plugin.name': 'Chess.com',
        'sync-games.button': 'Sync games',
        'sync-games-error.title': 'Failed to sync Chess.com games',
        'clear-synced-games.label': 'Clear synced games',
        'clear-synced-games-error.title': 'Failed to clear synced games',
        'empty-games.message': 'No games synced yet. Use Sync games to import your Chess.com archive.',
        'game-actions.label': 'Actions',
      },
    },
  },
] as const satisfies Resource[];
