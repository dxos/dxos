//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Operation } from '@dxos/compute';
import { Annotation } from '@dxos/echo';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { AppGraphBuilder, OperationHandler, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Gallery } from '#types';

export const GalleryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addMetadataModule({
    metadata: {
      id: Gallery.Gallery.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Gallery.Gallery).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Gallery.Gallery).pipe(Option.getOrThrow).hue ?? 'rose',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Gallery.make(props);
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
  AppPlugin.addSchemaModule({ schema: [Gallery.Gallery] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
