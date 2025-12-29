//
// Copyright 2025 DXOS.org
//

import { Common, Capability, Plugin } from '@dxos/app-framework';

import { meta } from './meta';

const Graph = Capability.lazy('Graph', () => import('./graph'));

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesBefore: [Common.ActivationEvent.SetupAppGraph, Common.ActivationEvent.SetupMetadata],
    activatesAfter: [Common.ActivationEvent.AppGraphReady],
    activate: Graph,
  }),
  Plugin.make,
);
