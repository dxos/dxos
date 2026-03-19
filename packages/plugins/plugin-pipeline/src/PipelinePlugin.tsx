//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';
import { Pipeline } from '@dxos/types';

import { AppGraphBuilder, OperationResolver, ReactSurface } from './capabilities';
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
        createObject: ((props) => Effect.sync(() => Pipeline.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Pipeline.Pipeline] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
