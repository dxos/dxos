//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin.name': 'Inspector',
        'companion.label': 'Agent Inspector',
        'stop-action.label': 'Stop',
        'clear-action.label': 'Clear',
        'status-running.label': 'Running',
        'status-idle.label': 'Idle',
        'status-stopped.label': 'Stopped',
        'status-hibernating.label': 'Waiting',
        'no-processes.message': 'No active agents',
        'timeline-empty.message': 'No execution steps yet.',
      },
    },
  },
] as const satisfies Resource[];
