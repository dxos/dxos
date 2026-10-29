//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as AppRole from '@dxos/app-toolkit/AppRole';
import { trim } from '@dxos/util';

import { PaymentsNamespace } from './src/namespace.ts';
import * as PaymentsCapabilities from './src/types/PaymentsCapabilities.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: PaymentsNamespace.key,
    name: 'Payments',
    author: 'DXOS',
    description: trim`
      Pay for an edge resource served by the DXOS payments-service. Authenticates with the same
      verifiable-presentation scheme as the rest of DXOS Edge and supports two payment paths:
      an inline x402 USDC micropayment (EIP-3009, Base Sepolia testnet) signed by an injected EVM
      wallet, or a Stripe Checkout redirect to top up a credit balance.
    `,
    icon: { key: 'ph--credit-card--regular', hue: 'green' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-payments',
    tags: ['labs'],
  },
  modules: [
    AppCapability.surface(() => import('./src/capabilities/react-surface.ts', { with: { type: 'module-url' } }), {
      roles: [AppRole.Article],
    }),
    AppCapability.settings(() => import('./src/capabilities/settings.ts', { with: { type: 'module-url' } }), {
      activatesOn: ActivationEvents.Idle,
      provides: [PaymentsCapabilities.Settings],
    }),
    AppCapability.translations(() => import('./src/translations.ts', { with: { type: 'module-url' } })),
  ],
});

export const { meta, make } = config;

export default config;
