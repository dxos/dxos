//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { Outline, OutlineOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: OutlineOperation.CreateOutline,
        handler: ({ name }) =>
          Effect.succeed({
            object: Outline.make({ name }),
          }),
      }),
    ]),
  ),
);
