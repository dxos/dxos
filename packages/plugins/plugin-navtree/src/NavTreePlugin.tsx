//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Graph } from '@dxos/plugin-graph';

import { AppGraphBuilder, Keyboard, OperationHandler, ReactSurface, State } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { NavTreeEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const NavTreePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: Capability.getModuleTag(State),
    requires: State.requires,
    provides: State.provides,
    // Migration bridge for unmigrated StateReady listeners.
    compatFires: [NavTreeEvents.StateReady],
    activate: State,
  }),
  Plugin.addModule({
    id: 'expose',
    requires: [AppCapabilities.AppGraph, AppCapabilities.Layout, Capabilities.OperationInvoker],
    provides: [],
    activate: Effect.fnUntraced(function* () {
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
  }),
  Plugin.addLazyModule(Keyboard),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default NavTreePlugin;
