//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities, AppCapability, LayoutOperation } from '@dxos/app-toolkit';
import { Graph } from '@dxos/plugin-graph';

import { NavTreeCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const Expose = Capability.inlineModule(
  'expose',
  { requires: [AppCapabilities.AppGraph, AppCapabilities.Layout, Capabilities.OperationInvoker], provides: [] },
  Effect.fnUntraced(function* () {
    const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
    const { invokePromise } = yield* Capabilities.OperationInvoker;
    const { graph } = yield* AppCapabilities.AppGraph;
    if (invokePromise && layout.active.length === 1) {
      // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
      //   That is the point at which the graph is expanded and the path should be available.
      void Graph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
        .then(() => invokePromise(LayoutOperation.Expose, { subject: layout.active[0] }))
        .catch(() => {});
    }

    return [];
  }),
);
export const Keyboard = Capability.lazyModule(
  'Keyboard',
  { requires: [AppCapabilities.AppGraph, Capabilities.OperationInvoker], provides: [] },
  () => import('./keyboard'),
);
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
export const State = Capability.lazyModule(
  'State',
  { requires: [Capabilities.AtomRegistry, AppCapabilities.Layout], provides: [NavTreeCapabilities.State] },
  () => import('./state'),
);
