//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Support } from '#types';

export const translations = [
  {
    'en-US': {
      [Support.Ticket.typename]: {
        'typename.label': 'Support ticket',
        'typename.label_zero': 'Support tickets',
        'typename.label_one': 'Support ticket',
        'typename.label_other': 'Support tickets',
        'object-name.placeholder': 'New ticket',
        'add-object.label': 'Add ticket',
        'rename-object.label': 'Rename ticket',
        'delete-object.label': 'Delete ticket',
        'object-deleted.label': 'Ticket deleted',
      },
      [meta.id]: {
        'plugin.name': 'Support',
        'title.label': 'Title',
        'body.label': 'Description',
        'resolution.label': 'Resolution',
        'status-open.label': 'Open',
        'status-in_progress.label': 'In progress',
        'status-resolved.label': 'Resolved',
        'mark-in-progress.button': 'Mark in progress',
        'resolve.button': 'Resolve',
        'reopen.button': 'Reopen',
      },
    },
  },
] as const satisfies Resource[];
