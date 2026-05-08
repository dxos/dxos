//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { SpaceCapabilities, type CreateObject } from '@dxos/plugin-space/types';
import { Pipeline } from '@dxos/types';

import { AppGraphBuilder, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

export const PipelinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  Plugin.addModule({
    id: 'create-object',
    activatesOn: AppActivationEvents.SetupMetadata,
    activate: Effect.fnUntraced(function* () {
      return Capability.contributes(SpaceCapabilities.CreateObjectEntry, {
        id: Pipeline.Pipeline.typename,
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Pipeline.make(props);
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
  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);

export default PipelinePlugin;
