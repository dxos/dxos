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

        'mailbox toolbar label': 'Message toolbar',
        'mailbox toolbar show enriched message': 'Show enriched message',
        'mailbox toolbar show plain message': 'Show plain message',
        'mailbox toolbar enriched message not available': 'Enriched message not available',

        'mailbox toolbar title': 'Mailbox toolbar',
        'mailbox toolbar sort oldest': 'Sort: Oldest first',
        'mailbox toolbar sort newest': 'Sort: Newest first',
        'mailbox toolbar filter by tags': 'Filter by tags',

        'message header view mode plain': 'Plain',
        'message header view mode enriched': 'Enriched',
        'message header view mode plain only': 'Plain',

        'related contacts title': 'Related contacts',
        'related messages title': 'Recent messages',
      },
    },
  },
];
