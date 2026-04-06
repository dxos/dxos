//
// Copyright 2023 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Channel } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Channel.Channel)]: {
        'typename.label': 'Channel',
        'typename.label_zero': 'Channels',
        'typename.label_one': 'Channel',
        'typename.label_other': 'Channels',
        'object-name.placeholder': 'New channel',
        'add-object.label': 'Add channel',
        'rename-object.label': 'Rename channel',
        'delete-object.label': 'Delete channel',
        'object-deleted.label': 'Channel deleted',
      },
      [meta.id]: {
        'plugin.name': 'Chat',
        'channel-title.label': 'Title',
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
        'chat.heading': 'Chat',
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

        'channel-companion.label': 'Channel',
        'call-panel.label': 'Active Call',

        'display-name.label': 'Display name',
        'display-name.description': 'Set your display name before joining a meeting.',
        'display-name-input.placeholder': 'Enter your name',
        'set-display-name.label': 'Continue',

        'call-tab.label': 'Call',
        'meeting-status.title': 'Calls',
        'share-meeting-link.label': 'Share meeting',
        'show-webrtc-stats.title': 'WebRTC Stats',
        'show-calls-history.title': 'Service History',

        'meeting-summary.label': 'Summary',
        'summarize.label': 'Summarize',
        'summarizing.label': 'Creating summary...',
        'create-summary.message': 'A summary doesn’t exist for this meeting yet. Create one now?',

        'icon-pin.label': 'Pin video',
        'icon-unpin.label': 'Unpin video',
        'icon-wave.label': 'Waving',
        'icon-muted.label': 'Muted',
        'join-call.button': 'Join',
        'leave-call.button': 'Leave',
        'mic-on.button': 'Unmute',
        'mic-off.button': 'Mute',
        'camera-on.button': 'Turn camera on',
        'camera-off.button': 'Turn camera off',
        'camera-off.label': 'Camera off',
        'raise-hand.button': 'Raise hand',
        'lower-hand.button': 'Lower hand',
        'screenshare-on.button': 'Share screen',
        'screenshare-off.button': 'Stop streaming',

        'channel-toolbar.title': 'Channel actions',
        'start-video-call.menu': 'Start video call',
      },
    },
  },
] as const satisfies Resource[];
