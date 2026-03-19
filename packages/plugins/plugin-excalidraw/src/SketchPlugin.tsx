//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Sketch } from '@dxos/plugin-sketch/types';
import { Operation } from '@dxos/operation';
import { type CreateObject, SpaceOperation } from '@dxos/plugin-space/types';

import { ExcalidrawSettings, OperationResolver, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const ExcalidrawPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Sketch.Sketch.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Sketch.Sketch).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Sketch.Sketch).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Sketch.make(props);
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
  AppPlugin.addOperationResolverModule({ activate: OperationResolver }),
  AppPlugin.addSchemaModule({ schema: [Sketch.Canvas, Sketch.Sketch] }),
  AppPlugin.addSettingsModule({ id: 'settings', activate: ExcalidrawSettings }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
