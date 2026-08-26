//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'LaMetric',
        'device-connected.label': 'LaMetric connected',
        'settings-address.label': 'Device address',
        'settings-apiKey.label': 'Device API key',
        'settings-appId.label': 'App ID',
        'settings-widgetId.label': 'Widget ID',
        'settings-accessToken.label': 'Access token',
        'settings-minPushIntervalMs.label': 'Minimum push interval (ms)',
      },
    },
  },
] as const satisfies Resource[];
