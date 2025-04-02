//
// Copyright 2023 DXOS.org
//

import { INBOX_PLUGIN } from './meta';
import { CalendarType, ContactsType, MailboxType } from './types';

export default [
  {
    'en-US': {
      [MailboxType.typename]: {
        'typename label': 'Mailbox',
        'object name placeholder': 'New mailbox',
      },
      [ContactsType.typename]: {
        'typename label': 'Contacts',
        'object name placeholder': 'New contacts',
      },
      [CalendarType.typename]: {
        'typename label': 'Calendar',
        'object name placeholder': 'New calendar',
      },
      [INBOX_PLUGIN]: {
        'plugin name': 'Inbox',
        'no messages': 'Mailbox empty',
        'action archive': 'Archive',
        'action delete': 'Delete',
        'action mark read': 'Mark as read',
      },
    },
  },
];
