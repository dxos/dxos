//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppCapabilities, AppPlugin, LayoutOperation } from '@dxos/app-toolkit';
import { Graph } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, Keyboard, OperationResolver, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import { meta } from './meta';
import { translations } from './translations';
import { NavTreeEvents } from './types';

export const NavTreePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: NODE_TYPE,
      metadata: {
        parse: ({ item }: TreeData, type: string) => {
          switch (type) {
            case 'node':
              return item;
            case 'object':
              return item.data;
            case 'view-object':
              return { id: `${item.id}-view`, object: item.data };
          }
        },
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'state',
    activatesOn: AppActivationEvents.LayoutReady,
    activatesAfter: [NavTreeEvents.StateReady],
    activate: State,
  }),
  Plugin.addModule({
    id: 'expose',
    activatesOn: ActivationEvent.allOf(
      ActivationEvents.OperationInvokerReady,
      AppActivationEvents.AppGraphReady,
      AppActivationEvents.LayoutReady,
      NavTreeEvents.StateReady,
    ),
    activate: Effect.fnUntraced(function* () {
      const layout = yield* Capabilities.getAtomValue(AppCapabilities.Layout);
      const { invokePromise } = yield* Capability.get(Capabilities.OperationInvoker);
      const { graph } = yield* Capability.get(AppCapabilities.AppGraph);
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
  Plugin.addModule({
    id: 'keyboard',
    activatesOn: ActivationEvent.allOf(AppActivationEvents.AppGraphReady, ActivationEvents.OperationInvokerReady),
    activate: Keyboard,
  }),
  Plugin.make,
);
