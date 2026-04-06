//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

export const translations = [
  {
    'en-US': {
      [Mailbox.Mailbox.typename]: {
        'typename.label': 'Mailbox',
        'typename.label_zero': 'Mailboxes',
        'typename.label_one': 'Mailbox',
        'typename.label_other': 'Mailboxes',
        'object-name.placeholder': 'New mailbox',
        'add-object.label': 'Add mailbox',
        'rename-object.label': 'Rename mailbox',
        'delete-object.label': 'Delete mailbox',
        'object-deleted.label': 'Mailbox deleted',
      },
      [Message.Message.typename]: {
        'typename.label': 'Message',
        'typename.label_zero': 'Messages',
        'typename.label_one': 'Message',
        'typename.label_other': 'Messages',
        'object-name.placeholder': 'New message',
        'add-object.label': 'Add message',
        'rename-object.label': 'Rename message',
        'delete-object.label': 'Delete message',
        'object-deleted.label': 'Message deleted',
      },
      [Calendar.Calendar.typename]: {
        'typename.label': 'Calendar',
        'typename.label_zero': 'Calendars',
        'typename.label_one': 'Calendar',
        'typename.label_other': 'Calendars',
        'object-name.placeholder': 'New calendar',
        'add-object.label': 'Add calendar',
        'rename-object.label': 'Rename calendar',
        'delete-object.label': 'Delete calendar',
        'object-deleted.label': 'Calendar deleted',
      },
      [meta.id]: {
        'plugin.name': 'Inbox',
        'empty-mailbox.message': 'Mailbox empty',
        'empty-calendar.message': 'Calendar empty',
        'no-message.message': 'Select a message to view it',
        'action-archive.menu': 'Archive',
        'action-delete.menu': 'Delete',
        'action-mark-read.menu': 'Mark as read',
        'message.label': 'Message',
        'event.label': 'Event',
        'no-integrations.label': 'No integrations configured',
        'manage-integrations-button.label': 'Manage Integrations',
        'inbox.label': 'Inbox',

        'sync-mailbox.label': 'Sync mailbox',
        'sync-mailbox-error.title': 'Failed to sync mailbox',
        'sync-calendar.label': 'Sync calendar',
        'sync-calendar-error.title': 'Failed to sync calendar',

        'show-contact.label': 'Show contact',
        'create-contact.label': 'Create contact',

        'mailbox-account.label': 'Account',
        'mailbox-account.placeholder': 'Select account...',
        'mailbox-sync.label': 'Mailbox Sync',

        'calendar-account.label': 'Account',
        'calendar-account.placeholder': 'Select account...',
        'calendar-sync.label': 'Calendar Sync',

        'enable-background-sync.label': 'Enable background sync',
        'enabling-background-sync.label': 'Enabling...',
        'disable-background-sync.label': 'Disable background sync',
        'view-trigger.label': 'View trigger',

        'event-untitled.label': 'Untitled',
        'event-toolbar.menu': 'Actions',
        'event-toolbar-create-note.menu': 'Create note',

        'message-toolbar.label': 'Message toolbar',
        'message-toolbar-reply.menu': 'Reply',
        'message-toolbar-reply-all.menu': 'Reply All',
        'message-toolbar-forward.menu': 'Forward',

        'mailbox-toolbar.title': 'Mailbox toolbar',
        'mailbox-toolbar-sort.menu': 'Sort messages',
        'mailbox-toolbar-filter.menu': 'Filter messages',

        'mailbox-toolbar-save-button.label': 'Save',
        'mailbox-toolbar-clear-button.label': 'Clear',
        'save-filter.placeholder': 'Filter name',
        'save-filter.button': 'Save',
        'delete-filter.label': 'Delete filter',

        'mailboxes-section.label': 'Mailboxes',
        'all-mail.label': 'All Mail',
        'drafts.label': 'Drafts',
        'create-draft.label': 'Create draft',

        'related-contacts.title': 'Related contacts',
        'recent-events.title': 'Recent events',
        'upcoming-events.title': 'Upcoming events',
        'related-messages.title': 'Recent messages',

        'compose-email.label': 'Compose email',
        'compose-email-dialog.title': 'Compose Email',
        'close.label': 'Close',
        'send-email-button.label': 'Send',
        'send-email-error.title': 'Failed to send email',
        'send-email-error-unknown.message': 'An unknown error occurred',
        'send-as-email.label': 'Send as email',

        'draft-subject.label': 'Subject',
        'draft-subject.placeholder': 'Message subject',
        'draft-body.label': 'Body',
        'draft-body.placeholder': 'Write your message...',

        'open-calendar.button': 'Open calendar',
        'open-profile.button': 'Open profile',
        'saved-filter-name.label': 'Filter name',
      },
    },
  },
  ...componentsTranslations,
] as const satisfies Resource[];
