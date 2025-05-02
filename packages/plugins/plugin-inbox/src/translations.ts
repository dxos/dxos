//
// Copyright 2023 DXOS.org
//

import { INBOX_PLUGIN } from './meta';
import { CalendarType, MailboxType } from './types';

export default [
  {
    'en-US': {
      [MailboxType.typename]: {
        'typename label': 'Mailbox',
        'object name placeholder': 'New mailbox',
      },
      [CalendarType.typename]: {
        'typename label': 'Calendar',
        'object name placeholder': 'New calendar',
      },
      [INBOX_PLUGIN]: {
        'plugin name': 'Inbox',
        'empty mailbox message': 'Mailbox empty',
        'no message message': 'Select a message to view it',
        'action archive': 'Archive',
        'action delete': 'Delete',
        'action mark read': 'Mark as read',
        'message label': 'Message',
        'no integrations label': 'No integrations configured',
        'manage integrations button label': 'Manage Integrations',

        'mailbox sync label': 'Mailbox Sync',
        'mailbox object settings configure sync button label': 'Configure sync',
        'mailbox object settings configure subscription button label': 'Configure subscription',
      },
    },
  },
];
