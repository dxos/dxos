//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';
import { Obj, Ref } from '@dxos/echo';

import { CanvasType, DiagramType, SketchAction, TLDRAW_SCHEMA } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = TLDRAW_SCHEMA, content = {} }) => ({
        data: {
          object: Obj.make(DiagramType, {
            name,
            canvas: Ref.make(Obj.make(CanvasType, { schema, content })),
          }),
        },
      }),
    }),
  );
