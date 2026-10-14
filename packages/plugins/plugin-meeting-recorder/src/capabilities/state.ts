//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { MeetingRecorderCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() =>
    Capability.contribute(
      MeetingRecorderCapabilities.State,
      Atom.make<MeetingRecorderCapabilities.RecorderState>({ phase: 'idle' }).pipe(Atom.keepAlive),
    ),
  ),
);
