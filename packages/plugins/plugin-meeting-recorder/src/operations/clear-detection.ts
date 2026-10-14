//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Operation from '@dxos/compute/Operation';

import { MeetingRecorderCapabilities, MeetingRecorderOperation } from '#types';

const handler: Operation.WithHandler<typeof MeetingRecorderOperation.ClearDetection> =
  MeetingRecorderOperation.ClearDetection.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* () {
        const registry = yield* Capability.get(Capabilities.AtomRegistry);
        const stateAtom = yield* Capability.get(MeetingRecorderCapabilities.State);
        if (registry.get(stateAtom).phase === 'detected') {
          registry.set(stateAtom, { phase: 'idle' });
        }
      }),
    ),
  );

export default handler;
