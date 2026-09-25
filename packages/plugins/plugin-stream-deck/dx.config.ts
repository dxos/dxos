//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.streamDeck',
    name: 'Stream Deck',
    author: 'DXOS',
    description: 'Project a space onto Stream Deck hardware — favorites on keys, progress and stats on dials.',
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-stream-deck',
    icon: { key: 'ph--squares-four--regular', hue: 'cyan' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
