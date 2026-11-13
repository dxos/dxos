//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { trim } from '@dxos/util';

import { OntologyNamespace } from './src/namespace.ts';

const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: OntologyNamespace.key,
    name: 'Ontology',
    author: 'DXOS',
    description: trim`
      Registers the base ECHO types that no product plugin owns: access tokens, sync cursors, blobs,
      collections, expandos, space properties, messages, organizations and people.
      It is headless and contributes types only, so a host that runs plugins alone, such as EDGE, still
      resolves objects of these types.
    `,
    source: 'https://github.com/dxos/dxos/tree/main/packages/plugins/plugin-ontology',
    icon: { key: 'ph--tree-structure--regular', hue: 'neutral' },
    spec: 'PLUGIN.mdl',
    tags: ['labs'],
  },
  modules: [AppCapability.schema(() => import('./src/capabilities/schema.ts', { with: { type: 'module-url' } }))],
});

export const { meta, make } = config;

export default config;
