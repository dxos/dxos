//
// Copyright 2025 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Trello } from '#types';

export const translations = [
  {
    'en-US': {
      [Trello.TrelloBoard.typename]: {
        'typename.label': 'Trello Board',
        'typename.label_zero': 'Trello Boards',
        'typename.label_one': 'Trello Board',
        'typename.label_other': 'Trello Boards',
        'object-name.placeholder': 'New board',
        'add-object.label': 'Add Trello board',
        'rename-object.label': 'Rename board',
        'delete-object.label': 'Delete board',
        'object-deleted.label': 'Board deleted',
      },
      [Trello.TrelloCard.typename]: {
        'typename.label': 'Trello Card',
        'typename.label_zero': 'Trello Cards',
        'typename.label_one': 'Trello Card',
        'typename.label_other': 'Trello Cards',
      },
      [meta.id]: {
        'plugin.name': 'Trello',
        'sync-board.label': 'Sync board',
        'sync-board-success.title': 'Board synced',
        'sync-board-error.title': 'Failed to sync board',
        'close.label': 'Close',
        'push-card.label': 'Push to Trello',
        'open-in-trello.label': 'Open in Trello',
        'last-synced.label': 'Last synced',
      },
    },
  },
] as const satisfies Resource[];
