//
// Copyright 2026 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.typefully',
    name: 'Typefully',
    author: 'DXOS',
    description: trim`
      Publish blog post drafts to Typefully. It implements the plugin-blogger PublisherService
      capability, authenticating via a plugin-connector Connection, so drafts authored in
      Composer can be created and listed on Typefully.
    `,
    icon: { key: 'ph--paper-plane-tilt--regular', hue: 'sky' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-typefully',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    dependsOn: ['org.dxos.plugin.blogger'],
  },
});
