//
// Copyright 2023 DXOS.org
//

import { type Resource } from '@dxos/react-ui';

import { meta } from './meta';

export const translations = [
  {
    'en-US': {
      [meta.id]: {
        'plugin name': 'Telemetry',
        'settings title': 'Telemetry settings',
        'observability toast label': 'Privacy Notice',
        'observability toast description':
          'Composer collects usage and performance metrics to improve the product. No user data is collected.',
        'observability toast action label': 'Settings',
        'observability toast action alt': 'Open settings to learn more or to disable.',
        'observability toast close label': 'Okay',
        'observability enabled label': 'Enable telemetry',
        // TODO: Add link about telemetry privacy. Make it clearer that user data is not collected.
        'observability description':
          'When enabled, basic usage data will used to improve the product. This may include performance metrics, error logs, and usage data. No personally identifiable information, other than your public key, is included with this data and no private data ever leaves your devices.',

        'help label': 'Feedback & Support',
        'feedback textarea label': 'Feedback',
        'feedback textarea placeholder': 'Please enter your feedback, technical issue, or feature request.',
        'send feedback label': 'Send Feedback',
        'feedback toast label': 'Thank you for your feedback!',
        'feedback toast description': 'We will review your feedback and get back to you as soon as possible.',
      },
    },
  },
] as const satisfies Resource[];
