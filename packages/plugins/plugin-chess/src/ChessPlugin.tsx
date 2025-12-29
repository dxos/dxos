//
// Copyright 2023 DXOS.org
//

import { Common, Capability, createIntent, Plugin } from '@dxos/app-framework';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';
import { type CreateObjectIntent } from '@dxos/plugin-space/types';

import { ChessBlueprint } from './blueprints';
import { BlueprintDefinition, IntentResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Chess, ChessAction } from './types';

export const ChessPlugin = Plugin.define(meta)
  .pipe(
    Plugin.addModule({
    id: 'translations',
    activatesOn: Common.ActivationEvent.SetupTranslations,
    activate: () => Capability.contributes(Common.Capability.Translations, translations),
    }),
    Plugin.addModule({
    id: 'metadata',
    activatesOn: Common.ActivationEvent.SetupMetadata,
    activate: () =>
      Capability.contributes(Common.Capability.Metadata, {
        id: Chess.Game.typename,
        metadata: {
          icon: 'ph--shield-chevron--regular',
          iconHue: 'amber',
          blueprints: [ChessBlueprint.Key],
          createObjectIntent: (() => createIntent(ChessAction.Create)) satisfies CreateObjectIntent,
          addToCollectionOnCreate: true,
        },
      }),
    }),
    Plugin.addModule({
    id: 'schema',
    activatesOn: ClientEvents.SetupSchema,
    activate: () => Capability.contributes(ClientCapabilities.Schema, [Chess.Game]),
    }),
    Plugin.addModule({
    id: 'react-surface',
    activatesOn: Common.ActivationEvent.SetupReactSurface,
    activate: ReactSurface,
    }),
    Plugin.addModule({
    id: 'intent-resolver',
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
    }),
    Plugin.addModule({
    id: 'blueprint',
    activatesOn: Common.ActivationEvent.SetupArtifactDefinition,
    activate: BlueprintDefinition,
    }),
    Plugin.make,
  );
