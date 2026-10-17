//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { CallOperation, CallsCapabilities } from '#types';

const handler: Operation.WithHandler<typeof CallOperation.SetSimulatedParticipants> =
  CallOperation.SetSimulatedParticipants.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ participants, transcript }) {
        const callManager = yield* Capability.get(CallsCapabilities.Manager);
        yield* Effect.promise(() =>
          callManager.simulate(participants.length > 0 ? [...participants] : undefined, transcript && [...transcript]),
        );
      }),
    ),
  );

export default handler;
