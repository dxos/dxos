//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TranscriptionCapabilities } from '#types';

/**
 * Observable live-transcription lifecycle phase, written by the driver and read by UI (toolbar
 * spinner, testbench telemetry) so the mic + pipeline state can be reflected in real time.
 */
export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const statusAtom = Atom.make<{ phase: TranscriptionCapabilities.PipelinePhase }>({ phase: 'idle' }).pipe(
      Atom.keepAlive,
    );
    return Capability.contribute(TranscriptionCapabilities.PipelineStatus, statusAtom);
  }),
);
