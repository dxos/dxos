//
// Copyright 2025 DXOS.org
//

import { defineConfig } from '@dxos/app-framework';
import { trim } from '@dxos/util';

export default defineConfig({
  plugin: {
    key: 'org.dxos.plugin.script',
    name: 'Scripts',
    description: trim`
      Write, deploy, and run custom TypeScript functions as ECHO objects directly inside your Composer spaces.
      Scripts execute on the Cloudflare Workers-based EDGE runtime and have access to the full DXOS SDK,
      Effect-TS, and a curated set of third-party libraries including HTTP, JSON, CSV, and date utilities.
      An AI Script assistant wires CRUD, deploy, invoke, and invocation-inspection operations as tools
      so an agent can scaffold, iterate, and test functions entirely within a chat session.
    `,
    icon: { key: 'ph--code--regular', hue: 'sky' },
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-explorer',
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
    screenshots: [{ dark: 'https://dxos.network/plugin-details-scripts-dark.png' }],
  },
});
