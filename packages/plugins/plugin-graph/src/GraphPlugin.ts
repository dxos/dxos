//
// Copyright 2025 DXOS.org
//

import { defineModule, eventKey, lazy, Events, definePlugin } from '@dxos/app-framework/next';

import meta from './meta';

/**
 * Manages the state of the graph for the application.
 * Enables other plugins to register node builders to add nodes to the graph.
 * This includes actions and annotation each other's nodes.
 */
export const GraphPlugin = definePlugin(meta, [
  defineModule({
    id: `${meta.id}/module/react-context`,
    activationEvents: [eventKey(Events.Startup)],
    activate: lazy(() => import('./GraphContext')),
  }),
  defineModule({
    id: `${meta.id}/module/graph`,
    activationEvents: [eventKey(Events.Startup)],
    dependentEvents: [eventKey(Events.SetupAppGraph)],
    triggeredEvents: [eventKey(Events.AppGraphReady)],
    activate: lazy(() => import('./graph')),
  }),
]);
