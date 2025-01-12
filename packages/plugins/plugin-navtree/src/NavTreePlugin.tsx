//
// Copyright 2025 DXOS.org
//

import { definePlugin, defineModule, Events, contributes, Capabilities, allOf } from '@dxos/app-framework';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, IntentResolver, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import { meta } from './meta';
import translations from './translations';

export const NavTreePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/state`,
      activatesOn: allOf(Events.DispatcherReady, Events.LayoutReady, Events.LocationReady),
      activate: State,
    }),
    defineModule({
      id: `${meta.id}/translations`,
      activatesOn: Events.SetupTranslations,
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/metadata`,
      activatesOn: Events.Startup,
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
      id: `${meta.id}/react-surface`,
      activatesOn: Events.Startup,
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/intent-resolver`,
      activatesOn: Events.Startup,
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/app-graph-builder`,
      activatesOn: Events.Startup,
      activate: AppGraphBuilder,
    }),
  ]);
