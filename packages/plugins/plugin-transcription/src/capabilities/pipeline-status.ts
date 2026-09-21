//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { TranscriptionCapabilities } from '#types';

export const PipelineStatus = Capability.makeModule(
  'PipelineStatus',
  { provides: [TranscriptionCapabilities.PipelineStatus] },
  Effect.fnUntraced(function* () {
    const statusAtom = Atom.make<{ phase: TranscriptionCapabilities.PipelinePhase }>({ phase: 'idle' }).pipe(
      Atom.keepAlive,
    );
    return Capability.contribute(TranscriptionCapabilities.PipelineStatus, statusAtom);
  }),
);
