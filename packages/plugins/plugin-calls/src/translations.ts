//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Calls',

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
      },
    },
  },
] as const satisfies Resource[];
