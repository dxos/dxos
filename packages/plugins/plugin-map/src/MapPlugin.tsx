//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin, createIntent } from '@dxos/app-framework';
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
    activatesOn: Common.ActivationEvent.SetupSettings,
    activate: MapState,
  }),
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Type.getTypename(Map.Map),
      metadata: {
        icon: 'ph--compass--regular',
        iconHue: 'green',
        inputSchema: MapAction.CreateMap,
        createIntent: ((props, options) =>
          createIntent(MapAction.Create, { ...props, space: options.db })) satisfies CreateObjectIntent,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Map.Map] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
