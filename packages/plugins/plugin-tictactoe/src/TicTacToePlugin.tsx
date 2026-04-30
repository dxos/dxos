//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { TicTacToeBlueprint } from '#blueprints';
import { BlueprintDefinition, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { TicTacToe } from '#types';

export const TicTacToePlugin = Plugin.define(meta).pipe(
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: TicTacToe.Game.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(TicTacToe.Game).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(TicTacToe.Game).pipe(Option.getOrThrow).hue ?? 'white',
        blueprints: [TicTacToeBlueprint.key],
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = TicTacToe.make(props);
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
  AppPlugin.addSchemaModule({ schema: [TicTacToe.Game] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
