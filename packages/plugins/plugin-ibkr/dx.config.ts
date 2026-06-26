//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.ibkr',
    name: 'Interactive Brokers',
    author: 'DXOS',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-ibkr',
    spec: 'PLUGIN.mdl',
    description: trim`
      Connects Interactive Brokers via the Flex Web Service (token + Flex query id) and lets the
      assistant answer questions about the user's portfolio, cash balances, and trade history.
      A daily background sync stores Flex report snapshots in the space; chat reads those snapshots,
      so the rate-limited IBKR API is touched only once a day, never on each query.
    `,
    icon: { key: 'ph--chart-line-up--regular', hue: 'green' },
    tags: ['labs', 'integration'],
  },
});
