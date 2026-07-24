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
        'accept-change.label': 'Accept change',
        'reject-change.label': 'Reject change',
        'suggestions.label': 'Suggestions',
        'thread-deleted.label': 'Thread deleted',
        'message-deleted.label': 'Message deleted',
        'draft.button': 'DRAFT',
        'no-comments.message': 'Select text and click <commentIcon></commentIcon> in the toolbar to create acomment.',
        'comments.label': 'Comments',
        'show-unresolved.label': 'Active comments',
        'show-all.label': 'All comments',
        'add-comment.label': 'Add comment',
        'view-mode.suggesting.label': 'Suggesting',
      },
    },
  },
] as const satisfies Resource[];
