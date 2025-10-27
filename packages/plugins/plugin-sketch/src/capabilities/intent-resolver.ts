//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver } from '@dxos/app-framework';

import { Diagram, SketchAction } from '../types';

export default () =>
  contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = Diagram.TLDRAW_SCHEMA, content = {} }) => ({
        data: {
          object: Diagram.make({ name, canvas: { schema, content } }),
        },
      }),
    }),
  );
