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
  createIntent,
  LayoutAction,
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
      activatesOn: allOf(Events.DispatcherReady, Events.LayoutReady, NavTreeEvents.StateReady),
      activate: async (context) => {
        const layout = context.getCapability(Capabilities.Layout);
        const { dispatchPromise: dispatch } = context.getCapability(Capabilities.IntentDispatcher);
        if (dispatch && layout.active.length === 1) {
          await dispatch(createIntent(LayoutAction.Expose, { part: 'navigation', subject: layout.active[0] }));
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
