//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { live, Ref.make } from '@dxos/live-object';

import { CanvasType, DiagramType, SketchAction, TLDRAW_SCHEMA } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = TLDRAW_SCHEMA, content = {} }) => ({
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
