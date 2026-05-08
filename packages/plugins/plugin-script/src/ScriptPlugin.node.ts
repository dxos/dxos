//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation, Script } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import { AppGraphBuilder, BlueprintDefinition, OperationHandler } from '#capabilities';
import { meta } from '#meta';
import { ScriptOperation } from '#operations';
import { Notebook } from '#types';

export const ScriptPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  Plugin.addModule({
    id: 'create-objects',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return [
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Script.Script.typename,
          inputSchema: ScriptOperation.ScriptProps,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const { object } = yield* Operation.invoke(ScriptOperation.CreateScript, props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Notebook.Notebook.typename,
          inputSchema: ScriptOperation.NotebookProps,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Notebook.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
      ];
    }),
  }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Script.Script] }),
  Plugin.make,
);

export default ScriptPlugin;
