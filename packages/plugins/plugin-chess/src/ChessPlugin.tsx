//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
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
        icon: Annotation.IconAnnotation.get(Chess.Game).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Chess.Game).pipe(Option.getOrThrow).hue ?? 'white',
        blueprints: [ChessBlueprint.key],
        createObject: ((props) => Effect.sync(() => Chess.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
