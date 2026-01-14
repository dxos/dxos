//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common } from '@dxos/app-framework';
import { OperationResolver } from '@dxos/operation';
import { Transcript } from '@dxos/types';

import { TranscriptOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationResolver, [
      OperationResolver.make({
        operation: TranscriptOperation.Create,
        handler: ({ space }) =>
          Effect.succeed({
            object: Transcript.make(space.queues.create().dxn),
          }),
      }),
    ]),
  ),
);
