//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { Operation } from '@dxos/operation';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { type CreateObject } from '@dxos/plugin-space/types';

import { BlueprintDefinition, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { Voxel } from '#types';

import { translations } from './translations';

export const VoxelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Voxel.World.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Voxel.World).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Voxel.World).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props, options) =>
          Effect.gen(function* () {
            const object = Voxel.make(props);
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
  AppPlugin.addSchemaModule({ schema: [Voxel.World] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
