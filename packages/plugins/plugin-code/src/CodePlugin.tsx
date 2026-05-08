//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';

import {
  AppGraphBuilder,
  BlueprintDefinition,
  OperationHandler,
  ReactSurface,
  Settings as SettingsCapability,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { CodeProject, SourceFile, Spec } from '#types';

export const CodePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'create-objects',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return [
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: Spec.Spec.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const object = Spec.make(props);
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
        Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
          id: CodeProject.CodeProject.typename,
          createObject: ((props, options) =>
            Effect.gen(function* () {
              const spec = Spec.make();
              const project = CodeProject.make({ name: props?.name, spec });
              // Add the linked Spec to the space so the Ref resolves.
              yield* Operation.invoke(SpaceOperation.AddObject, {
                object: spec,
                target: options.target,
                hidden: true,
                targetNodeId: options.targetNodeId,
              });
              return yield* Operation.invoke(SpaceOperation.AddObject, {
                object: project,
                target: options.target,
                hidden: false,
                targetNodeId: options.targetNodeId,
              });
            })) satisfies CreateObject,
        }),
      ];
    }),
  }),
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Spec.Spec, CodeProject.CodeProject, SourceFile.SourceFile] }),
  AppPlugin.addSettingsModule({ activate: SettingsCapability }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default CodePlugin;
