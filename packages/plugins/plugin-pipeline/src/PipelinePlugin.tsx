//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { type CreateObject } from '@dxos/plugin-space/types';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { Pipeline } from '@dxos/types';

import { AppGraphBuilder, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const PipelinePlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Pipeline.Pipeline.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Pipeline.Pipeline).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Pipeline.Pipeline).pipe(Option.getOrThrow).hue ?? 'white',
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
      },
    },
  }),

  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
