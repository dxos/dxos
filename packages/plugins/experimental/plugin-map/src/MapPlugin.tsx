//
// Copyright 2023 DXOS.org
//

import {
  Capabilities,
  contributes,
  createIntent,
  defineModule,
  definePlugin,
  Events,
  oneOf,
} from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, MapState, IntentResolver, ReactSurface } from './capabilities';
import { MAP_PLUGIN, meta } from './meta';
import translations from './translations';
import { MapType, MapAction } from './types';

export const MapPlugin = () =>
  definePlugin(meta, [
    defineModule({
      id: `${meta.id}/module/state`,
      activatesOn: Events.Startup,
      activate: MapState,
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
          id: MapType.typename,
          metadata: {
            createObject: (props: { name?: string }) => createIntent(MapAction.Create, props),
            placeholder: ['object title placeholder', { ns: MAP_PLUGIN }],
            icon: 'ph--compass--regular',
          },
        }),
    }),
    defineModule({
      id: `${meta.id}/module/schema`,
      activatesOn: ClientEvents.SetupSchema,
      activate: () => contributes(ClientCapabilities.Schema, [MapType]),
    }),
    defineModule({
      id: `${meta.id}/module/react-surface`,
      activatesOn: Events.SetupSurfaces,
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
