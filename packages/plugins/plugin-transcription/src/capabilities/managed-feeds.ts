//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { TranscriptionCapabilities } from '#types';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    // Feed URIs an open TranscriptionManager is writing to; consumed by the UI to hide its local recorder.
    const managedFeeds = Atom.make<ReadonlySet<string>>(new Set<string>()).pipe(Atom.keepAlive);
    return Capability.contributes(TranscriptionCapabilities.ManagedFeeds, managedFeeds);
  }),
);
