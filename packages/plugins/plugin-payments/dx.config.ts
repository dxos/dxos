//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.payments',
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
});
