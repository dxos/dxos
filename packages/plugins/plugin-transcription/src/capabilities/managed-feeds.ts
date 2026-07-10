//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TranscriptionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Feeds an active meeting call is writing to; consumed by the UI to hide its local recorder and to
    // toggle the meeting-wide transcription instead.
    const managedFeeds = Atom.make<ReadonlyMap<string, TranscriptionCapabilities.ManagedFeedControl>>(new Map()).pipe(
      Atom.keepAlive,
    );
    return Capability.contributes(TranscriptionCapabilities.ManagedFeeds, managedFeeds);
  }),
);
