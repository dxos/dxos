//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-thread';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'plugin.name': 'Threads',
        'thread-title.placeholder': 'New thread',
        'thread-title.label': 'Title',
        'delete-thread.label': 'Delete',
        'select-thread.label': 'Select comment',
        'create-thread.label': 'Create thread',
        'message.placeholder': 'Enter message...',
        'comment.placeholder': 'Enter comment...',
        'settings-standalone.label': 'Enable standalone thread creation',
        'anonymous.label': 'Anonymous',
        'enter-to-send.message': 'Enter to add ⏎',
        'edit-message.label': 'Edit',
        'save-message.label': 'Save',
        'delete-message.label': 'Delete',
        'accept-proposal.label': 'Accept proposal',
        'accept-change.label': 'Accept change',
        'reject-change.label': 'Reject change',
      },
    },
  },
] as const satisfies Resource[];
