//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

export const translationKey = '@dxos/react-ui-thread';

export const translations = [
  {
    'en-US': {
      [translationKey]: {
        'plugin name': 'Threads',
        'thread title placeholder': 'New thread',
        'thread title label': 'Title',
        'delete thread label': 'Delete',
        'create thread label': 'Create thread',
        'message placeholder': 'Enter message...',
        'comment placeholder': 'Enter comment...',
        'settings standalone label': 'Enable standalone thread creation',
        'anonymous label': 'Anonymous',
        'enter to send message': 'Enter to add ⏎',
      },
    },
  },
] as const satisfies Resource[];
