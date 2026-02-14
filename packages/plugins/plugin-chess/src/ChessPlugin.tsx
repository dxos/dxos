//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ChessBlueprint } from './blueprints';
import { BlueprintDefinition, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Chess } from './types';

export const ChessPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        icon: 'ph--shield-chevron--regular',
        iconHue: 'amber',
        blueprints: [ChessBlueprint.Key],
        createObject: ((props) => Effect.sync(() => Chess.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
