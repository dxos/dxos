//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { CodeCapabilities } from '#types';

/**
 * Contributes the transient build/run state atom. Keyed by `CodeProject.id`;
 * each entry holds the most recent build and run results plus a `busy` flag.
 * `Atom.keepAlive` prevents the atom from being collected when no subscriber
 * is mounted — important because the agent may write build status while no
 * `CodeArticle` is open.
 */
export default Capability.makeModule(() =>
  Effect.sync(() => {
    const atom = Atom.make<CodeCapabilities.BuildRunState>({}).pipe(Atom.keepAlive);
    return Capability.contribute(CodeCapabilities.BuildRun, atom);
  }),
);
