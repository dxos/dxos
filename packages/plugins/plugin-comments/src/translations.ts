//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Comments',
        'message.placeholder': 'Reply…',
        'activity.message': 'Processing…',
        'anonymous.label': 'Anonymous',
        'delete-message-block.label': 'Delete message block',
        'detached-thread.label': 'Referenced content was removed',
        'delete-thread.label': 'Delete thread',
        'resolve-thread.label': 'Resolve thread',
        'thread-deleted.label': 'Thread deleted',
        'message-deleted.label': 'Message deleted',
        'comments.heading': 'Comments',
        'draft.button': 'DRAFT',
        'no-comments.title': 'Comments',
        'no-comments.message':
          'Click on the <commentIcon></commentIcon> button in the document toolbar to create a comment thread on the selected text.',
        'toggle-show-resolved.label': 'Show resolved',
        'unnamed-object-threads.label': 'Threads',
        'mark-as-resolved.label': 'Mark as resolved',
        'mark-as-unresolved.label': 'Mark as unresolved',
        'save-message.label': 'Save',
        'edit-message.label': 'Edit',
        'delete-message.label': 'Delete message',
        'accept-proposal.label': 'Accept proposal',
        'open-comments-panel.label': 'Show Comments',
        'comments.label': 'Comments',
        'show-all.label': 'All comments',
        'show-unresolved.label': 'Unresolved comments',
        'add-comment.label': 'Add comment',
      },
    },
  },
] as const satisfies Resource[];
