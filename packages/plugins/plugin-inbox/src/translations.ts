//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';
import { translations as componentsTranslations } from '@dxos/react-ui-components/translations';
import { Message } from '@dxos/types';

import { meta } from '#meta';
import { Calendar, Mailbox } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Mailbox.Mailbox)]: {
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
      [Type.getTypename(Message.Message)]: {
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
      [Type.getTypename(Calendar.Calendar)]: {
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
      [meta.profile.key]: {
        'plugin.name': 'Inbox',

        'no-message.message': 'Select a message to view it',

        'action-archive.menu': 'Archive',
        'action-delete.menu': 'Delete',
        'action-mark-read.menu': 'Mark as read',
        'message.label': 'Message',
        'event.label': 'Event',
        'facts.label': 'Facts',
        'inbox.label': 'Inbox',

        'no-connections.label': 'No connections configured',

        'sync-mailbox.label': 'Sync',
        'sync-mailbox-error.title': 'Failed to sync mailbox',
        'sync-mailbox-success.title': 'Mailbox sync complete',
        'empty-mailbox.message': 'Mailbox empty',

        'sync-calendar.label': 'Sync calendar',
        'sync-calendar-error.title': 'Failed to sync calendar',
        'sync-calendar-success.title': 'Calendar sync complete',
        'empty-calendar.message': 'Calendar empty',

        'sync-contacts.label': 'Sync contacts',
        'sync-contacts-error.title': 'Failed to sync contacts',
        'sync-contacts-success.title': 'Contacts sync complete',

        'show-contact.label': 'Show contact',
        'create-contact.label': 'Create contact',
        'remove-attendee.label': 'Remove attendee',
        'event-add-attendee.placeholder': 'Add a person by name, or enter an email',

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

        'view-mode.menu': 'View mode',
        'view-mode-html.menu': 'HTML',
        'view-mode-enriched.menu': 'Enriched',
        'view-mode-markdown.menu': 'Markdown',
        'view-mode-plain.menu': 'Plain text',

        'event-untitled.label': 'Untitled',
        'event-all-day.label': 'All day',
        'event-duration.placeholder': 'Duration',
        'event-duration-custom.label': 'Custom end…',
        'event-toolbar.menu': 'Actions',
        'event-toolbar-open.menu': 'Open',
        'event-toolbar-save.menu': 'Save to calendar',
        'event-toolbar-more.menu': 'More',
        'star-event.label': 'Star event',
        'unstar-event.label': 'Unstar event',
        'event-toolbar-delete.menu': 'Delete event',

        'calendar-toolbar.menu': 'Calendar toolbar',
        'calendar-toolbar-create-event.menu': 'Create event',
        'calendar-toolbar-sync.menu': 'Save events to calendar',

        'message-toolbar.label': 'Message toolbar',
        'message-toolbar-open.menu': 'Open',
        'message-toolbar-reply.menu': 'Reply',
        'message-toolbar-reply-all.menu': 'Reply All',
        'message-toolbar-forward.menu': 'Forward',
        'message-toolbar-ai-reply.menu': 'AI reply',
        'draft-toolbar.label': 'Draft toolbar',
        'draft-toolbar-generate.menu': 'Generate reply',
        'message-toolbar-delete.menu': 'Delete',
        'message-toolbar-extract.menu': 'Extract',
        'message-toolbar-load-images.menu': 'Load remote images',

        'message-body.placeholder': 'Enter message text...',

        'mailbox-toolbar.title': 'Mailbox toolbar',
        'mailbox-toolbar-sort.menu': 'Sort messages',
        'mailbox-toolbar-extract.menu': 'Extract',
        'mailbox-toolbar-filter.menu': 'Filter messages',
        'mailbox-toolbar-save-button.label': 'Save',
        'mailbox-toolbar-clear-button.label': 'Clear',

        'save-filter.placeholder': 'Filter name',
        'save-filter.button': 'Save',
        'rename-filter.label': 'Rename filter',
        'delete-filter.label': 'Delete filter',

        'mailboxes-section.label': 'Mailboxes',
        'all-mail.label': 'All Mail',
        'drafts.label': 'Drafts',
        'drafts.article.description': 'Draft list (coming soon).',
        'drafts.empty.message': 'No drafts yet.',
        'topics.label': 'Topics',
        'topic.label': 'Topic',
        'topics.toolbar.title': 'Topics toolbar',
        'analyze-topics.label': 'Analyze Topics',
        'analyze-topics-success.title': 'Topics updated.',
        'analyze-topics-error.title': 'Failed to analyze topics.',
        'topics.empty.message': 'No topics yet. Run "Analyze Topics" from the mailbox toolbar.',
        'topics.count.label':
          '{{threads}} threads · {{participants}} participants · {{questions}} questions · {{tasks}} tasks',
        'topics.delete.label': 'Delete topic',
        'topics.suggested.title': 'Suggested',
        'topics.accept.label': 'Accept',
        'topics.dismiss.label': 'Dismiss',
        'subscriptions.label': 'Subscriptions',
        'subscriptions.toolbar.title': 'Subscriptions toolbar',
        'subscriptions.empty.message': 'No bulk-mail subscriptions found.',
        'subscriptions.count.label': '{{email}} · {{count}} messages',
        'subscriptions.remove.label_zero': 'Remove',
        'subscriptions.remove.label_one': 'Remove ({{count}})',
        'subscriptions.remove.label_other': 'Remove ({{count}})',
        'create-draft.label': 'Create draft',

        'related-contacts.title': 'Related contacts',
        'recent-events.title': 'Recent events',
        'upcoming-events.title': 'Upcoming events',
        'related-messages.title': 'Recent messages',

        'compose-email.label': 'Compose email',
        'compose-email-dialog.title': 'Compose Email',
        'close.label': 'Close',
        'send-email-button.label': 'Send',
        'send-email-success.title': 'Message sent',
        'send-email-error.title': 'Failed to send email',
        'draft-message.title': 'Draft',
        'delete-draft-button.label': 'Delete draft',
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
