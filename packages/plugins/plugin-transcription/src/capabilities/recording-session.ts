//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { TranscriptionCapabilities } from '#types';

export const RecordingSession = Capability.makeModule(
  'RecordingSession',
  { provides: [TranscriptionCapabilities.RecordingSession] },
  Effect.fnUntraced(function* () {
    const sessionAtom = Atom.make<TranscriptionCapabilities.RecordingSession | null>(null).pipe(Atom.keepAlive);
    return Capability.contribute(TranscriptionCapabilities.RecordingSession, sessionAtom);
  }),
);
