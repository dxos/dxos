//
// Copyright 2026 DXOS.org
//

import { Type } from '@dxos/echo';
import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';
import { Call } from '#types';

export const translations = [
  {
    'en-US': {
      [Type.getTypename(Call.Call)]: {
        'typename.label': 'Call',
        'typename.label_zero': 'Calls',
        'typename.label_one': 'Call',
        'typename.label_other': 'Calls',
        'object-name.placeholder': 'New call',
        'add-object.label': 'Add call',
        'rename-object.label': 'Rename call',
        'delete-object.label': 'Delete call',
        'object-deleted.label': 'Call deleted',
      },
      [meta.id]: {
        'plugin.name': 'Calls',

        'channel-companion.label': 'Channel',
        'call-panel.label': 'Active Call',

        'meetings.label': 'All Meetings',
        'meeting.label': 'Meeting',

        'start-transcription.label': 'Start transcription',
        'stop-transcription.label': 'Stop transcription',

        'meeting-list.label': 'Meetings',
        'create-meeting.label': 'Start New Meeting',
        'select-meeting.label': 'Set Active',
        'share-call-link.label': 'Share call link',

        'meeting-companion.label': 'Meeting Notes',
        'notes.label': 'Notes',
        'stats.label': 'Stats',
        'summary.label': 'Summary',
        'regenerate-summary.label': 'Regenerate Summary',
        'generate-summary.label': 'Generate Summary',

        'transcript-companion.label': 'Meeting Transcript',

        'display-name.label': 'Display name',
        'display-name.description': 'Set your display name before joining a meeting.',
        'display-name-input.placeholder': 'Enter your name',
        'set-display-name.label': 'Continue',

        'call-tab.label': 'Call',
        'meeting-status.title': 'Calls',
        'share-meeting-link.label': 'Share meeting',
        'show-webrtc-stats.title': 'WebRTC Stats',
        'show-calls-history.title': 'Service History',

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
