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
        'message-controls.title': 'Message actions',
        'edit-message.label': 'Edit',
        'save-message.label': 'Save',
        'cancel-edit.label': 'Cancel edit',
        'editing.message': 'Enter to save · Escape to cancel · Shift+Enter for a new line',
        'delete-message.label': 'Delete',
        'accept-proposal.label': 'Accept proposal',
        'accept-change.label': 'Accept change',
        'reject-change.label': 'Reject change',
        'add-reaction.label': 'Add reaction',
        'reply-message.label': 'Reply',
        'start-thread.label': 'Start a thread',
        'replying-to.label': 'Replying to {{name}}',
        'cancel-reply.label': 'Cancel reply',
        'reply-count.label_one': '{{count}} reply',
        'reply-count.label_other': '{{count}} replies',
      },
    },
  },
] as const satisfies Resource[];
