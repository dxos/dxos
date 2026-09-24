//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { CodeCapabilities } from '#types';
import { CodeEvents } from '#types';

/**
 * Contributes the transient build/run state atom. Keyed by `CodeProject.id`;
 * each entry holds the most recent build and run results plus a `busy` flag.
 * `Atom.keepAlive` prevents the atom from being collected when no subscriber
 * is mounted — important because the agent may write build status while no
 * `CodeArticle` is open.
 */
export const BuildRunState = Capability.makeModule(
  'BuildRunState',
  { provides: [CodeCapabilities.BuildRun], activatesOn: CodeEvents.Start },
  () =>
    Effect.sync(() => {
      const atom = Atom.make<CodeCapabilities.BuildRunState>({}).pipe(Atom.keepAlive);
      return Capability.contribute(CodeCapabilities.BuildRun, atom);
    }),
);
