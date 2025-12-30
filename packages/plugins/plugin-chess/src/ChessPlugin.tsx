//
// Copyright 2023 DXOS.org
//

import { Common, Plugin, createIntent } from '@dxos/app-framework';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { ChessBlueprint } from './blueprints';
import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Chess, ChessAction } from './types';

export const ChessPlugin = Plugin.define(meta).pipe(
  Common.Plugin.addTranslationsModule({ translations }),
  Common.Plugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        icon: 'ph--shield-chevron--regular',
        iconHue: 'amber',
        blueprints: [ChessBlueprint.Key],
        createObjectIntent: (() => createIntent(ChessAction.Create)) satisfies CreateObjectIntent,
        addToCollectionOnCreate: true,
      },
    },
  }),
  Common.Plugin.addSchemaModule({ schema: [Chess.Game] }),
  Common.Plugin.addSurfaceModule({ activate: ReactSurface }),
  Common.Plugin.addIntentResolverModule({ activate: IntentResolver }),
  Common.Plugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.make,
);
