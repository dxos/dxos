//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, createResolver } from '@dxos/app-framework';
import { Diagram } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA, SketchAction } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(
      Common.Capability.IntentResolver,
      createResolver({
        intent: SketchAction.Create,
        resolve: ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) => ({
          data: {
            object: Diagram.make({ name, canvas: { schema, content } }),
          },
        }),
      }),
    ),
  ),
);
