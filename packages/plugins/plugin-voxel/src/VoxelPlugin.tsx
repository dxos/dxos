//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { type CreateObject } from '@dxos/plugin-space/types';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';
import { Voxel } from './types';

export const VoxelPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: Voxel.World.typename,
      metadata: {
        icon: 'ph--cube--regular',
        createObject: ((props) => Effect.sync(() => Voxel.make(props))) satisfies CreateObject,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [Voxel.World] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
