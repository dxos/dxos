//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';
import { Channel } from './types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Channel.Channel)]: {
        'typename label': 'Channel',
        'typename label_zero': 'Channels',
        'typename label_one': 'Channel',
        'typename label_other': 'Channels',
        'object name placeholder': 'New channel',
        'rename object label': 'Rename channel',
        'delete object label': 'Delete channel',
        'object deleted label': 'Channel deleted',
      },
      [meta.id]: {
        'plugin name': 'Chat',
        'channel title label': 'Title',
        'message placeholder': 'Reply…',
        'activity message': 'Processing…',
        'anonymous label': 'Anonymous',
        'delete message block label': 'Delete message block',
        'detached thread label': 'Referenced content was removed',
        'delete thread label': 'Delete thread',
        'resolve thread label': 'Resolve thread',
        'thread deleted label': 'Thread deleted',
        'message deleted label': 'Message deleted',
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
        'accept proposal label': 'Accept proposal',
        'open comments panel label': 'Show Comments',
        'comments label': 'Comments',
        'show all label': 'All comments',
        'show unresolved label': 'Unresolved comments',
        'add comment label': 'Add comment',

        'channel companion label': 'Channel',
        'call panel label': 'Active Call',

        'display name label': 'Display name',
        'display name description': 'Set your display name before joining a meeting.',
        'display name input placeholder': 'Enter your name',
        'set display name label': 'Continue',

        'call tab label': 'Call',
        'meeting status title': 'Meeting',
        'share meeting link label': 'Share meeting',
        'show webrtc stats title': 'WebRTC Stats',
        'show calls history title': 'Service History',

        'meeting summary label': 'Summary',
        'summarize label': 'Summarize',
        'summarizing label': 'Creating summary...',
        'create summary message': 'A summary doesn’t exist for this meeting yet. Create one now?',

        'join call': 'Join',
        'leave call': 'Leave',

        'lobby participants_zero': 'No participants',
        'lobby participants_one': '1 participant',
        'lobby participants_other': '{{count}} participants',

        'icon pin': 'Pin video',
        'icon unpin': 'Unpin video',
        'icon wave': 'Waving',
        'icon muted': 'Muted',
        'icon speaking': 'Speaking',

        'mic on': 'Unmute',
        'mic off': 'Mute',
        'camera on': 'Turn camera on',
        'camera off': 'Turn camera off',
        'camera off label': 'Camera off',

        'raise hand': 'Raise hand',
        'lower hand': 'Lower hand',
        'screenshare on': 'Share screen',
        'screenshare off': 'Stop streaming',
      },
    },
  },
] as const satisfies Resource[];
