//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components';

import { meta } from './meta';
import { Calendar, Mailbox } from './types';

export const translations = [
  {
    'en-US': {
      [Mailbox.Mailbox.typename]: {
        'typename label': 'Mailbox',
        'typename label_zero': 'Mailboxes',
        'typename label_one': 'Mailbox',
        'typename label_other': 'Mailboxes',
        'object name placeholder': 'New mailbox',
        'rename object label': 'Rename mailbox',
        'delete object label': 'Delete mailbox',
      },
      [Calendar.Calendar.typename]: {
        'typename label': 'Calendar',
        'typename label_zero': 'Calendars',
        'typename label_one': 'Calendar',
        'typename label_other': 'Calendars',
        'object name placeholder': 'New calendar',
        'rename object label': 'Rename calendar',
        'delete object label': 'Delete calendar',
      },
      [meta.id]: {
        'plugin name': 'Inbox',
        'empty mailbox message': 'Mailbox empty',
        'no message message': 'Select a message to view it',
        'action archive': 'Archive',
        'action delete': 'Delete',
        'action mark read': 'Mark as read',
        'message label': 'Message',
        'event label': 'Event',
        'no integrations label': 'No integrations configured',
        'manage integrations button label': 'Manage Integrations',
        'inbox label': 'Inbox',

        'show contact label': 'Show contact',
        'create contact label': 'Create contact',

        'sync mailbox label': 'Sync mailbox',

        'mailbox sync label': 'Mailbox Sync',
        'mailbox object settings configure sync button label': 'Configure sync',
        'mailbox object settings configure subscription button label': 'Configure subscription',

        'event toolbar create note menu': 'Create note',

        'message toolbar label': 'Message toolbar',
        'message toolbar show enriched message': 'Show enriched message',
        'message toolbar show plain message': 'Show plain message',
        'message toolbar enriched message not available': 'Enriched message not available',

        'mailbox toolbar title': 'Mailbox toolbar',
        'mailbox toolbar sort': 'Sort messages',
        'mailbox toolbar filter': 'Filter messages',

        'mailbox toolbar save button label': 'Save',
        'mailbox toolbar clear button label': 'Clear',
        'save filter placeholder': 'Filter name',
        'save filter button': 'Save',
        'delete filter label': 'Delete filter',

        'message header view mode plain': 'Plain',
        'message header view mode enriched': 'Enriched',
        'message header view mode plain only': 'Plain',

        'related contacts title': 'Related contacts',
        'related messages title': 'Recent messages',
      },
    },
  },
  ...componentsTranslations,
] as const satisfies Resource[];
