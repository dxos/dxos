//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { trim } from '@dxos/util';

import { GraphNamespace } from './src/namespace.ts';

// Annotated: the capability modules import `meta` from here, so inferring it would be circular.
const config: Plugin.PluginConfig = Plugin.config({
  plugin: {
    key: GraphNamespace.key,
    name: 'Graph',
    author: 'DXOS',
    description: trim`
      Graph database layer providing relationship modeling and queries for workspace objects.
      Build knowledge graphs and explore complex data relationships.
    `,
    tags: ['system'],
  },
  modules: [
    Capability.lazyModule(
      'Graph',
      { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.AppGraph] },
      () => import('./src/graph.ts', { with: { type: 'module-url' } }),
    ),
  ],
});

export const { meta, make } = config;

export default config;
