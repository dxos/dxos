//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, Plugin, Capability, createIntent } from '@dxos/app-framework';
import { Type } from '@dxos/echo';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { AppGraphBuilder, BlueprintDefinition, IntentResolver, MapState, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Map, MapAction } from './types';

export const MapPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'state',
    // TODO(wittjosiah): Does not integrate with settings store.
    //   Should this be a different event?
    //   Should settings store be renamed to be more generic?
    activatesOn: Events.SetupSettings,
    activate: MapState,
  }),
  Plugin.addModule({
    id: 'translations',
    activatesOn: Events.SetupTranslations,
    activate: () => Capability.contributes(Capabilities.Translations, translations),
  }),
  Plugin.addModule({
    id: 'metadata',
    activatesOn: Events.SetupMetadata,
    activate: () =>
      Capability.contributes(Capabilities.Metadata, {
        id: Type.getTypename(Map.Map),
        metadata: {
          icon: 'ph--compass--regular',
          iconHue: 'green',
          inputSchema: MapAction.CreateMap,
          createIntent: ((props, options) =>
            createIntent(MapAction.Create, { ...props, space: options.db })) satisfies CreateObjectIntent,
        },
      }),
  }),
  Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Map.Map]),
  }),
  Plugin.addModule({
    id: 'react-surface',
    activatesOn: Events.SetupReactSurface,
    activate: ReactSurface,
  }),
  Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.addModule({
    id: 'app-graph-builder',
    activatesOn: Events.SetupAppGraph,
    activate: AppGraphBuilder,
  }),
  Plugin.addModule({
    id: 'blueprint',
    activatesOn: Events.SetupArtifactDefinition,
    activate: BlueprintDefinition,
  }),
  Plugin.make,
);
