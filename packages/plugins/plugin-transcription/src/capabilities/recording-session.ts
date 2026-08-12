//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom';
import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { TranscriptionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const sessionAtom = Atom.make<TranscriptionCapabilities.RecordingSession | null>(null).pipe(Atom.keepAlive);
    return Capability.contribute(TranscriptionCapabilities.RecordingSession, sessionAtom);
  }),
);
