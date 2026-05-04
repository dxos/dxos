//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation, Ref } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { BlueprintDefinition, OperationHandler, ReactSurface, Settings as SettingsCapability } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { CodeProject, Spec } from '#types';

const specIcon = Annotation.IconAnnotation.get(Spec.Spec).pipe(Option.getOrThrow);
const codeProjectIcon = Annotation.IconAnnotation.get(CodeProject.CodeProject).pipe(Option.getOrThrow);

export const CodePlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: [
      {
        id: Spec.Spec.typename,
        metadata: {
          icon: specIcon.icon,
          iconHue: specIcon.hue ?? 'white',
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
        },
      },
      {
        id: CodeProject.CodeProject.typename,
        metadata: {
          icon: codeProjectIcon.icon,
          iconHue: codeProjectIcon.hue ?? 'white',
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
        },
      },
    ],
  }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({ schema: [Spec.Spec, CodeProject.CodeProject] }),
  AppPlugin.addSettingsModule({ activate: SettingsCapability }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
