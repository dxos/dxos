//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';
import { EXCALIDRAW_SCHEMA, CanvasType, DiagramType } from '@dxos/plugin-sketch/types';

import { SketchAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(SketchAction.Create, ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) => ({
      data: {
        object: create(DiagramType, {
          name,
          canvas: makeRef(create(CanvasType, { schema, content })),
          threads: [],
        }),
      },
    })),
  );
