//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';

import { meta } from '#meta';

const Graph = Capability.lazyModule(
  'Graph',
  { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.AppGraph] },
  () => import('./graph'),
);

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = Plugin.define(meta).pipe(Plugin.addLazyModule(Graph), Plugin.make);

export default GraphPlugin;
