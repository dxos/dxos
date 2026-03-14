//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { Sketch, SketchOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: SketchOperation.Create,
        handler: ({ name, schema = Sketch.TLDRAW_SCHEMA, content = {} }) =>
          Effect.succeed({
            object: Sketch.make({ name, canvas: { schema, content } }),
          }),
      }),
    ]),
  ),
);
