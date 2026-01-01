//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';

import { Diagram, SketchOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: SketchOperation.Create,
        handler: ({ name, schema = Diagram.TLDRAW_SCHEMA, content = {} }) =>
          Effect.succeed({
            object: Diagram.make({ name, canvas: { schema, content } }),
          }),
      }),
    ]),
  ),
);
