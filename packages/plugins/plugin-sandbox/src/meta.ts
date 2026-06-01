//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';
import { trim } from '@dxos/util';

export const meta = Plugin.makeMeta({
  key: DXN.make('org.dxos.plugin.sandbox'),
  name: 'Sandbox',
  author: 'DXOS',
  spec: 'PLUGIN.mdl',
  description: trim`
    Sandbox plugin for DXOS Composer that provides isolated shell environments.
    Each sandbox is a persistent container identified by an ECHO object in the space.
    An AI Sandbox assistant provides tools to create sandboxes, run shell commands,
    and transfer files between ECHO and the sandbox filesystem.
  `,
  icon: 'ph--terminal--regular',
  iconHue: 'green',
  source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-sandbox',
  tags: ['labs'],
});
