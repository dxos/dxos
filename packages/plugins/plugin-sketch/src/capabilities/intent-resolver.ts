//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';

import { Diagram, SketchAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = Diagram.TLDRAW_SCHEMA, content = {} }) => ({
        data: {
          object: Diagram.make({ name, canvas: { schema, content } }),
        },
      }),
    }),
  ),
);
