//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Comments',
        'message.placeholder': 'Reply…',
        'activity.message': 'Processing…',
        'detached-thread.label': 'Referenced content was removed',
        'delete-thread.label': 'Delete thread',
        'resolve-thread.label': 'Resolve thread',
        'thread-deleted.label': 'Thread deleted',
        'message-deleted.label': 'Message deleted',
        'draft.button': 'DRAFT',
        'no-comments.message':
          'Click on the <commentIcon></commentIcon> button in the document toolbar to create a comment thread on the selected text.',
        'comments.label': 'Comments',
        'show-all.label': 'All comments',
        'show-unresolved.label': 'Unresolved comments',
        'add-comment.label': 'Add comment',
      },
    },
  },
] as const satisfies Resource[];
