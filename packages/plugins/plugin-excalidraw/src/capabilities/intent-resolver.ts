//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, createResolver } from '@dxos/app-framework';
import { Diagram } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA, SketchAction } from '../types';

export default Capability.makeModule(() =>
  Capability.contributes(
    Capabilities.IntentResolver,
    createResolver({
      intent: SketchAction.Create,
      resolve: ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) => ({
        data: {
          object: Diagram.make({ name, canvas: { schema, content } }),
        },
      }),
    }),
  ),
);
