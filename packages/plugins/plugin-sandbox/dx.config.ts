//
// Copyright 2025 DXOS.org
//

import { Config2 } from '@dxos/app-framework/config';
import { trim } from '@dxos/util';

export default Config2.make({
  plugin: {
    key: 'org.dxos.plugin.sandbox',
    name: 'Sandbox',
    author: 'DXOS',
    description: trim`
      Sandbox plugin for DXOS Composer that provides isolated shell environments.
      Each sandbox is a persistent container identified by an ECHO object in the space.
      An AI Sandbox assistant provides tools to create sandboxes, run shell commands,
      and transfer files between ECHO and the sandbox filesystem.
    `,
    icon: { key: 'ph--terminal--regular', hue: 'green' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sandbox',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
});
