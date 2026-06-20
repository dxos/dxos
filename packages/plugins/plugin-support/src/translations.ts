//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Support } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Support.Ticket)]: {
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
      [meta.profile.key]: {
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
        // Help companion (plank-companion--help surface, shows owning plugin's meta.description).
        'help-companion.label': 'Help',
        // Feedback (deck-companion--help surface).
        'help.label': 'Feedback & Support',
        // Discord (deck-companion--discord surface).
        'discord.label': 'Discord',
        'discord-loading.message': 'Loading…',
        'discord-unavailable.message': 'Discord widget unavailable.',
        'members-online.label_one': '{{count}} member online',
        'members-online.label_other': '{{count}} members online',
        'join-discord.button': 'Join Discord',
        'feedback-textarea.label': 'Feedback',
        'feedback-textarea.placeholder': 'Please enter your feedback, technical issue, or feature request.',
        'include-debug-logs.label': 'Include debug logs',
        'send-feedback.label': 'Send Feedback',
        'create-github-issue.label': 'Create GitHub Issue',
        'github-issue-toast.label': 'GitHub issue draft opened',
        'github-issue-toast.description': 'Finish the submission in the GitHub tab.',
        'github-issue-toast-no-screenshot.description':
          'Finish the submission in the GitHub tab. (Screenshot could not be attached.)',
        'github-issue-popup-blocked-toast.label': "Couldn't open the GitHub tab",
        'github-issue-popup-blocked-toast.description':
          'Your browser blocked the popup. Allow popups for this site and click Create GitHub Issue again.',
        'ask-for-help.label': 'Ask for Help on Discord',
        'discord-presence-team.label': '{{count}} team',
        'discord-presence-members.label': '{{count}} members',
        'discord-presence-online.label': 'Online:',
        'download-logs.label': 'Download logs',
        'feedback-toast.label': 'Thank you for your feedback!',
        'feedback-toast.description': 'We will review your feedback and get back to you as soon as possible.',
        'discord-feedback-toast.label': 'Help thread started in Discord',
        'discord-feedback-toast.description': 'Your thread is now open in Discord.',
        // Welcome tour + keyboard shortcuts (absorbed from plugin-help).
        'open-help-tour.message': 'Show welcome tour',
        'open-shortcuts.label': 'Show shortcuts',
        'shortcuts-dialog.title': 'Shortcuts',
        'welcome.title': 'Welcome to Composer',
        'welcome.description':
          'This is your personal space. Open a ticket from the Support assistant, or start the guided tour to learn how to get started.',
        'start-tour.button': 'Start tour',
        'hide-welcome.button': 'Hide Welcome',
        // Settings.
        'settings.title': 'Support settings',
        'show-welcome.label': 'Show welcome',
        // Help menu (status-indicator surface; right-rail ? dropdown).
        'help-menu.label': 'Help & resources',
        'docs.label': 'Documentation',
        'shortcuts.label': 'Keyboard shortcuts',
        'github.label': 'GitHub',
        'download-apps.label': 'Download apps',
        'about.label': 'About Composer',
        'released.message': 'Released {{released}}',
      },
    },
  },
] as const satisfies Resource[];
