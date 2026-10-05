//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { translations as cardTranslations } from '@dxos/react-ui-card/translations';
import type * as Theme from '@dxos/react-ui/Theme';

import { meta } from '#meta';
import { Notifications } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Notifications.Notifications)]: {
        'typename.label': 'Notifications',
        'typename.label_zero': 'Notifications',
        'typename.label_one': 'Notifications',
        'typename.label_other': 'Notifications',
      },
      [meta.profile.key]: {
        'plugin.name': 'Messenger',
        'notifications-panel.label': 'Notifications',
        'notifications-toolbar.menu': 'Notifications actions',
        'notifications-filter.menu': 'Filter notifications',
        'filter-all.label': 'All',
        'filter-unread.label': 'Unread',
        'filter-invitations.label': 'Invitations',
        'mark-all-read.label': 'Mark all as read',
        'mark-read.label': 'Mark as read',
        'mark-unread.label': 'Mark as unread',
        'delete-notification.label': 'Delete',
        'unread.label': 'Unread',
        'empty.message': 'No notifications yet.',
        'empty-filtered.message': 'No matching notifications.',
        'account-required.message': 'Notifications need an account on this deployment.',
        'no-default-space.message': 'Notifications appear once your default space is ready.',
        'space-invitation-toast.title': 'You’ve been added to a space',
        'space-invitation-toast.description': 'A contact invited you to join a space.',
        'join-space-invitation.label': 'Join',
        'dismiss-space-invitation.label': 'Dismiss',
      },
    },
  },
  ...cardTranslations,
] as const satisfies Theme.Resource[];
