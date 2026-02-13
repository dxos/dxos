//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/operation';
import { SpaceCapabilities, SpaceEvents } from '@dxos/plugin-space';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Pipeline } from '@dxos/types';

import { AppGraphBuilder, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { PipelineOperation } from './types';

export const PipelinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Pipeline.Pipeline.typename,
      metadata: {
        icon: 'ph--check-square-offset--regular',
        iconHue: 'purple',
        createObject: ((props) => Effect.sync(() => Pipeline.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.addModule({
    id: 'on-space-created',
    activatesOn: SpaceEvents.SpaceCreated,
    activate: () =>
      Effect.succeed(
        Capability.contributes(SpaceCapabilities.OnCreateSpace, (params) =>
          Operation.invoke(PipelineOperation.OnCreateSpace, params),
        ),
      ),
  }),
  Plugin.make,
);
