//
// Copyright 2025 DXOS.org
//

import { definePlugin, defineModule, eventKey, Events, contributes, Capabilities } from '@dxos/app-framework/next';
import { type TreeData } from '@dxos/react-ui-list';

import { AppGraphBuilder, IntentResolver, ReactSurface, State } from './capabilities';
import { NODE_TYPE } from './components';
import meta from './meta';
import translations from './translations';

export const NavTreePlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/state`,
      activationEvents: [eventKey(Events.Startup)],
      activate: State,
    }),
    defineModule({
      id: `${meta.id}/translations`,
      activationEvents: [eventKey(Events.SetupTranslations)],
      activate: () => contributes(Capabilities.Translations, translations),
    }),
    defineModule({
      id: `${meta.id}/metadata`,
      activationEvents: [eventKey(Events.Startup)],
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
      activationEvents: [eventKey(Events.Startup)],
      activate: ReactSurface,
    }),
    defineModule({
      id: `${meta.id}/intent-resolver`,
      activationEvents: [eventKey(Events.Startup)],
      activate: IntentResolver,
    }),
    defineModule({
      id: `${meta.id}/app-graph-builder`,
      activationEvents: [eventKey(Events.Startup)],
      activate: AppGraphBuilder,
    }),
  ]);
