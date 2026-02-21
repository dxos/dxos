//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { ComputeGraph } from '@dxos/conductor';
import { type CreateObject } from '@dxos/plugin-space/types';
import { CanvasBoard } from '@dxos/react-ui-canvas-editor';

import { ReactSurface } from './capabilities';
import { meta } from './meta';
import { translations } from './translations';

export const ConductorPlugin = Plugin.define(meta).pipe(
  AppPlugin.addMetadataModule({
    metadata: {
      id: CanvasBoard.CanvasBoard.typename,
      metadata: {
        icon: 'ph--infinity--regular',
        iconHue: 'sky',
        createObject: ((props) => Effect.sync(() => CanvasBoard.make(props))) satisfies CreateObject,
        addToCollectionOnCreate: true,
      },
    },
  }),
  AppPlugin.addSchemaModule({ schema: [CanvasBoard.CanvasBoard, ComputeGraph] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  Plugin.make,
);
