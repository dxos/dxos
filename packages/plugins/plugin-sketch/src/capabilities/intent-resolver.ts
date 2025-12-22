//
// Copyright 2025 DXOS.org
//

import { Capabilities, contributes, createResolver, defineCapabilityModule } from '@dxos/app-framework';

import { Diagram, SketchAction } from '../types';

export default defineCapabilityModule(() =>
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
  ));
