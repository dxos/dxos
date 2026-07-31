//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from '#meta';

export const translations = [
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Telemetry',
        'help.label': 'Feedback',
        'observability-toast.label': 'Privacy Notice',
        'observability-toast.description':
          'Composer collects usage and performance metrics to improve the product. No user data is collected.',
        'observability-toast-action.label': 'Settings',
        'observability-toast-action.alt': 'Open settings to learn more or to disable.',
        'observability-toast-close.label': 'Okay',
        // TODO: Add link about telemetry privacy. Make it clearer that user data is not collected.
        'observability.description':
          'When enabled, basic usage data will used to improve the product. This may include performance metrics, error logs, and usage data. No personally identifiable information, other than your public key, is included with this data and no private data ever leaves your devices.',
      },
    },
  },
] as const satisfies Resource[];
