//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';

import { FactsCompanion } from '#containers';
import { BrainSurface } from '#types';

/** React surfaces contributed by plugin-brain — the per-space facts panel. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'brain.facts',
        filter: Surface.makeFilter(BrainSurface.Facts),
        component: FactsCompanion,
      }),
    ]),
  ),
);
