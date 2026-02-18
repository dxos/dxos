//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';
import { Diagram } from '@dxos/plugin-sketch/types';

import { EXCALIDRAW_SCHEMA, SketchOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: SketchOperation.Create,
        handler: ({ name, schema = EXCALIDRAW_SCHEMA, content = {} }) =>
          Effect.succeed({
            object: Diagram.make({ name, canvas: { schema, content } }),
          }),
      }),
    ]),
  ),
);
