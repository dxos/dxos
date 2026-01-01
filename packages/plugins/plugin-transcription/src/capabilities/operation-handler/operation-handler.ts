//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, OperationResolver } from '@dxos/app-framework';
import { Transcript } from '@dxos/types';

import { TranscriptOperation } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.OperationHandler, [
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
