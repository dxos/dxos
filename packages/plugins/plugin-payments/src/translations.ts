//
// Copyright 2026 DXOS.org
//

import { translations as formTranslations } from '@dxos/react-ui-form/translations';
import type * as ThemeProvider from '@dxos/react-ui/ThemeProvider';

import { meta } from '#meta';

export const translations = [
  ...formTranslations,
  {
    'en-US': {
      [meta.profile.key]: {
        'plugin.name': 'Payments',
        'payments-url.label': 'Payments service URL',
        'payments-url.placeholder': 'https://payments.dxos.network',
        'buy-premium.label': 'Buy premium (x402)',
        'buy-credits.label': 'Buy 100 credits (Stripe)',
        'no-payments-url.message': 'Set the payments service URL in settings first.',
        'no-identity.message': 'Sign in before purchasing.',
        'no-wallet.message': 'No injected EVM wallet (window.ethereum) detected.',
        'pending.label': 'Working…',
        'result.label': 'Result',
        'error.label': 'Error',
      },
    },
  },
] as const satisfies ThemeProvider.Resource[];
