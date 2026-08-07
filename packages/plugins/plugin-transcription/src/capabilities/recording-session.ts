//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { Atom } from 'effect/unstable/reactivity';

import * as Capability from '@dxos/app-framework/Capability';

import * as TranscriptionCapabilities from '../types/TranscriptionCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const sessionAtom = Atom.make<TranscriptionCapabilities.RecordingSession | null>(null).pipe(Atom.keepAlive);
    return Capability.contribute(TranscriptionCapabilities.RecordingSession, sessionAtom);
  }),
);
