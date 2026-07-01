//
// Copyright 2026 DXOS.org
//

import { type Resource } from '@dxos/react-ui';
import { translations as formTranslations } from '@dxos/react-ui-form/translations';

import { meta } from './meta';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Payments',
        'payments-url.label': 'Payments service URL',
        'payments-url.placeholder': 'https://payments.example.com',
        'buy-premium.label': 'Buy premium (x402)',
        'buy-credits.label': 'Buy 100 credits (Stripe)',
        'no-payments-url.message': 'Set the payments service URL in settings first.',
        'no-wallet.message': 'No injected EVM wallet (window.ethereum) detected.',
        'pending.label': 'Working…',
        'result.label': 'Result',
        'error.label': 'Error',
      },
    },
  },
] as const satisfies Resource[];
