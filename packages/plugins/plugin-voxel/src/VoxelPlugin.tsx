//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { Annotation } from '@dxos/echo';
import { type CreateObject } from '@dxos/plugin-space/types';

import { BlueprintDefinition, ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Voxel } from './types';

export const VoxelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Voxel.World.typename,
      metadata: {
        icon: Annotation.IconAnnotation.get(Voxel.World).pipe(Option.getOrThrow).icon,
        iconHue: Annotation.IconAnnotation.get(Voxel.World).pipe(Option.getOrThrow).hue ?? 'white',
        createObject: ((props) => Effect.sync(() => Voxel.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Voxel.World] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addBlueprintDefinitionModule({ activate: BlueprintDefinition }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
