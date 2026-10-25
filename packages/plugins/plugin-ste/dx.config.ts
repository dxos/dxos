//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.ste',
    name: 'Simplified Technical English',
    author: 'DXOS',
    description: trim`
      An assistant skill that writes and rewrites technical text in Simplified Technical English (ASD-STE100),
      with a check tool that finds violations of the writing rules and words outside the approved word list.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-ste',
    icon: { key: 'ph--text-aa--regular', hue: 'teal' },
    spec: 'PLUGIN.mdl',
    tags: ['labs', 'assistant'],
  },
});
