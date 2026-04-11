//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';

import { TicTacToeBlueprint } from './blueprints';
import { BlueprintDefinition, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { TicTacToe } from './types';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: TicTacToe.Game.typename,
      metadata: {
        icon: 'ph--hash--regular',
        iconHue: 'teal',
        blueprints: [TicTacToeBlueprint.key],
        createObject: ((props) => Effect.sync(() => TicTacToe.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [TicTacToe.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
