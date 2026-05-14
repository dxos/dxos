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
        // Feedback (deck-companion--help surface).
        'help.label': 'Feedback & Support',
        'feedback-textarea.label': 'Feedback',
        'feedback-textarea.placeholder': 'Please enter your feedback, technical issue, or feature request.',
        'include-debug-logs.label': 'Include debug logs',
        'send-feedback.label': 'Send Feedback',
        'download-logs.label': 'Download logs',
        'feedback-toast.label': 'Thank you for your feedback!',
        'feedback-toast.description': 'We will review your feedback and get back to you as soon as possible.',
        // Welcome tour + keyboard shortcuts (absorbed from plugin-help).
        'open-help-tour.message': 'Show welcome tour',
        'open-shortcuts.label': 'Show shortcuts',
        'shortcuts-dialog.title': 'Shortcuts',
        // Welcome virtual node (personal space).
        'welcome-node.label': 'Welcome',
        'welcome.title': 'Welcome to Composer',
        'welcome.description':
          'This is your personal space. Open a ticket from the Support assistant, or start the guided tour to learn the basics.',
        'start-tour.button': 'Start tour',
        'open-chat.button': 'Open Support Chat',
        // Carousel.
        'carousel-prev.label': 'Previous',
        'carousel-next.label': 'Next',
        'carousel-viewport.label': 'Slide viewport (use arrow keys to navigate)',
        'carousel-indicators.label': 'Carousel slides',
        'carousel-go-to.label': 'Go to slide {{index}}',
        // Settings.
        'settings.title': 'Support settings',
        'show-welcome.label': 'Show welcome article on personal space',
      },
    },
  },
] as const satisfies Resource[];
