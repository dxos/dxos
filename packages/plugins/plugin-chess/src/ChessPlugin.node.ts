//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import { BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { Chess } from '#types';

export const ChessPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Chess.Game.typename,
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
      });
    }),
  }),
  AppPlugin.addSchemaModule({ schema: [Chess.Game] }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.make,
);

export default ChessPlugin;
