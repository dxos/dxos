//
// Copyright 2023 DXOS.org
//

import { ChannelType } from '@dxos/plugin-space/types';

import { THREAD_PLUGIN } from './meta';

export default [
  {
    'en-US': {
      [ChannelType.typename]: {
        'typename label': 'Channel',
        'object name placeholder': 'New channel',
      },
      [THREAD_PLUGIN]: {
        'plugin name': 'Threads',
        'channel title label': 'Title',
        'message placeholder': 'Reply…',
        'activity message': 'Processing…',
        'anonymous label': 'Anonymous',
        'delete message block label': 'Delete message block',
        'detached thread label': 'Referenced content was removed',
        'delete thread label': 'Delete thread',
        'thread deleted label': 'You deleted a thread.',
        'message deleted label': 'You deleted a message.',
        'comments heading': 'Comments',
        'chat heading': 'Chat',
        'draft button': 'DRAFT',
        'no comments title': 'Comments',
        'no comments message':
          'Click on the <commentIcon></commentIcon> button in the document toolbar to create a comment thread on the selected text.',
        'toggle show resolved': 'Show resolved',
        'unnamed object threads label': 'Threads',
        'mark as resolved label': 'Mark as resolved',
        'mark as unresolved label': 'Mark as unresolved',
        'save message label': 'Save',
        'edit message label': 'Edit',
        'delete message label': 'Delete message',
        'open comments panel label': 'Show Comments',
        'comments label': 'Comments',
        'show all label': 'All comments',
        'show unresolved label': 'Unresolved only',
      },
    },
  },
];
