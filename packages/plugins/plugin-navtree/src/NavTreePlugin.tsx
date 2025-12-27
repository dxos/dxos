//
// Copyright 2025 DXOS.org
//

import {
  Capabilities,
  Events,
  LayoutAction,
  allOf,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
} from '@dxos/app-framework';
import { Graph } from '@dxos/plugin-graph';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, IntentResolver, Keyboard, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import { NavTreeEvents } from './events';
import { meta } from './meta';
import { translations } from './translations';

export const NavTreePlugin = definePlugin(meta, () => [
  defineModule({
    id: `${meta.id}/module/state`,
    activatesOn: Events.LayoutReady,
    activatesAfter: [NavTreeEvents.StateReady],
    activate: State,
  }),
  defineModule({
    id: `${meta.id}/module/translations`,
    activatesOn: Events.SetupTranslations,
    activate: () => contributes(Capabilities.Translations, translations),
  }),
  defineModule({
    id: `${meta.id}/module/metadata`,
    activatesOn: Events.SetupMetadata,
    activate: () =>
      contributes(Capabilities.Metadata, {
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
      }),
  }),
  defineModule({
    id: `${meta.id}/module/expose`,
    activatesOn: allOf(Events.DispatcherReady, Events.AppGraphReady, Events.LayoutReady, NavTreeEvents.StateReady),
    activate: async (context) => {
      const layout = context.getCapability(Capabilities.Layout);
      const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
      const { graph } = context.getCapability(Capabilities.AppGraph);
      if (dispatch && layout.active.length === 1) {
        // TODO(wittjosiah): This should really be fired once the navtree renders for the first time.
        //   That is the point at which the graph is expanded and the path should be available.
        void Graph.waitForPath(graph, { target: layout.active[0] }, { timeout: 30_000 })
          .then(() => dispatch(createIntent(LayoutAction.Expose, { part: 'navigation', subject: layout.active[0] })))
          .catch(() => {});
      }

      return [];
    },
  }),
  defineModule({
    id: `${meta.id}/module/keyboard`,
    activatesOn: Events.AppGraphReady,
    activate: Keyboard,
  }),
  defineModule({
    id: `${meta.id}/module/react-surface`,
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  defineModule({
    id: `${meta.id}/module/app-graph-builder`,
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
]);
