//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { IllustratorCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(IllustratorCapabilities.Refit, Atom.make<Record<string, number>>({}).pipe(Atom.keepAlive)),
  ),
);
