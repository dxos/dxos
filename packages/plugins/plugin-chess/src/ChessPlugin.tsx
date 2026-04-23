//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ChessBlueprint } from '#blueprints';
import { BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Chess } from '#types';

import { translations } from './translations';

export const ChessPlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Chess.Game.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Chess.Game).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Chess.Game).pipe(Option.getOrThrow).hue ?? 'white',
        blueprints: [ChessBlueprint.key],
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Chess.make(props);
            return yield* Operation.invoke(SpaceOperation.AddObject, {
              object,
              target: options.target,
              hidden: true,
              targetNodeId: options.targetNodeId,
            });
          })) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
