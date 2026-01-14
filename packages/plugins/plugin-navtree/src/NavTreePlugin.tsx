//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvent, Capability, Common, Plugin } from '@dxos/app-framework';
import { Graph } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, Keyboard, OperationResolver, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import { NavTreeEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const NavTreePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'state',
    activatesOn: Common.ActivationEvent.LayoutReady,
    activatesAfter: [NavTreeEvents.StateReady],
    activate: State,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
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
  Plugin.addModule({
    id: 'expose',
    activatesOn: ActivationEvent.allOf(
      Common.ActivationEvent.OperationInvokerReady,
      Common.ActivationEvent.AppGraphReady,
      Common.ActivationEvent.LayoutReady,
      NavTreeEvents.StateReady,
    ),
    activate: Effect.fnUntraced(function* () {
      const layout = yield* Capability.get(Common.Capability.Layout);
      const { invokePromise } = yield* Capability.get(Common.Capability.OperationInvoker);
      const { graph } = yield* Capability.get(Common.Capability.AppGraph);
      if (invokePromise && layout.active.length === 1) {
        // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
        //   That is the point at which the graph is expanded and the path should be available.
        void Graph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
          .then(() => invokePromise(Common.LayoutOperation.Expose, { subject: layout.active[0] }))
          .catch(() => {});
      }

      return [];
    }),
  }),
  Plugin.addModule({
    id: 'keyboard',
    activatesOn: Common.ActivationEvent.AppGraphReady,
    activate: Keyboard,
  }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.make,
);
