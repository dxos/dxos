//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { live } from '@dxos/live-object';
import { CanvasType, DiagramType } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA, SketchAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) => ({
        data: {
          object: live(DiagramType, {
            name,
            canvas: Ref.make(live(CanvasType, { schema, content })),
            threads: [],
          }),
        },
      }),
    }),
  );
