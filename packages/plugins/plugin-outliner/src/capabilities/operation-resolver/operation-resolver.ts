//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { Outline, OutlineOperation, OutlinerOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: OutlinerOperation.OnCreateSpace,
        // TODO(wittjosiah): Remove?
        handler: Effect.fnUntraced(function* () {}),
      }),
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
