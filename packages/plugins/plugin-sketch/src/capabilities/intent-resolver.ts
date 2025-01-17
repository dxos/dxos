//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, createResolver } from '@dxos/app-framework';
import { create, makeRef } from '@dxos/live-object';

import { CanvasType, DiagramType, SketchAction, TLDRAW_SCHEMA } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver(SketchAction.Create, ({ name, schema = TLDRAW_SCHEMA, content = {} }) => ({
      data: {
        object: create(DiagramType, {
          name,
          canvas: makeRef(create(CanvasType, { schema, content })),
          threads: [],
        }),
      },
    })),
  );
