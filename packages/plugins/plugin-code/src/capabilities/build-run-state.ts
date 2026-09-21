//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { CodeCapabilities } from '#types';
import { CodeEvents } from '#types';

export const BuildRunState = Capability.makeModule(
  'BuildRunState',
  { provides: [CodeCapabilities.BuildRun], activatesOn: CodeEvents.Start },
  () =>
    Effect.sync(() => {
      const atom = Atom.make<CodeCapabilities.BuildRunState>({}).pipe(Atom.keepAlive);
      return Capability.contribute(CodeCapabilities.BuildRun, atom);
    }),
);
