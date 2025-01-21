//
// Copyright 2025 DXOS.org
//

import {
  definePlugin,
  defineModule,
  Events,
  contributes,
  Capabilities,
  allOf,
  oneOf,
  NavigationAction,
  createIntent,
} from '@dxos/app-framework';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, IntentResolver, Keyboard, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import { NavTreeEvents } from './events';
import { meta } from './meta';
import translations from './translations';

export const NavTreePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: allOf(Events.LayoutReady, Events.LocationReady),
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
      activatesOn: oneOf(Events.Startup, Events.SetupAppGraph),
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
      activatesOn: allOf(Events.DispatcherReady, Events.LayoutReady, Events.LocationReady, NavTreeEvents.StateReady),
      activate: async (context) => {
        const location = context.requestCapability(Capabilities.Location);
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);

        const soloPart = location.active.solo?.[0];
        if (dispatch && soloPart) {
          await dispatch(createIntent(NavigationAction.Expose, { id: soloPart.id }));
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
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntents,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/module/app-graph-builder`,
      activatesOn: Events.SetupAppGraph,
      activate: AppGraphBuilder,
    }),
  ]);
