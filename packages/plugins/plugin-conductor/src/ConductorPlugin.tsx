//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ComputeGraph } from '@dxos/conductor';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';

import { ReactSurface } from '#capabilities';
import { meta } from '#meta';

import { translations } from './translations';

export const ConductorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: CanvasBoard.CanvasBoard.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(CanvasBoard.CanvasBoard).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(CanvasBoard.CanvasBoard).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = CanvasBoard.make(props);
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
  AppPlugin.addSchemaModule({ schema: [CanvasBoard.CanvasBoard, ComputeGraph] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
