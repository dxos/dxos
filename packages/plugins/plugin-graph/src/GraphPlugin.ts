//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents } from '@dxos/app-toolkit';

import { meta } from '#meta';

const Graph = Capability.lazy('Graph', () => import('./graph'));

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export default Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    firesBeforeActivation: [AppActivationEvents.SetupAppGraph, AppActivationEvents.SetupMetadata],
    firesAfterActivation: [AppActivationEvents.AppGraphReady],
    activate: Graph,
  }),
  Plugin.make,
);
