//
// Copyright 2025 DXOS.org
//

import { Events, defineModule, definePlugin, lazy } from '@dxos/app-framework';

import { meta } from './meta';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/graph`,
    activatesOn: Events.Startup,
    activatesBefore: [Events.SetupAppGraph, Events.SetupMetadata],
    activatesAfter: [Events.AppGraphReady],
    activate: lazy(() => import('./graph')),
  }),
]);
