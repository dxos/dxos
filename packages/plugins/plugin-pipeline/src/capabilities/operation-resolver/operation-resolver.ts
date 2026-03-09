//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';

import { PipelineOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.OperationResolver, [
      OperationResolver.make({
        operation: PipelineOperation.OnCreateSpace,
        // TODO(wittjosiah): Remove?
        handler: Effect.fnUntraced(function* () {}),
      }),
    ]),
  ),
);
