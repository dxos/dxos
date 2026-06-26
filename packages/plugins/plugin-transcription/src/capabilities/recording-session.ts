//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TranscriptionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const sessionAtom = Atom.make<TranscriptionCapabilities.RecordingSession | null>(null).pipe(Atom.keepAlive);
    return Capability.contributes(TranscriptionCapabilities.RecordingSession, sessionAtom);
  }),
);
