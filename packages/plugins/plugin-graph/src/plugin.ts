//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { meta } from '#meta';

const Graph = Capability.lazyModule(
  'Graph',
  { requires: [Capabilities.AtomRegistry], provides: [AppCapabilities.AppGraph] },
  () => import('./graph.ts'),
);

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = Plugin.define(meta).pipe(Plugin.addModule(Graph), Plugin.make);

export default GraphPlugin;
