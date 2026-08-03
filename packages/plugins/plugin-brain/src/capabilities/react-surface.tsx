//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';

import { FactsCompanion } from '#containers';

import * as BrainSurface from '../types/BrainSurface';

/** React surfaces contributed by plugin-brain — the per-space facts panel. */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'brain.facts',
        filter: Surface.makeFilter(BrainSurface.Facts),
        component: () => <FactsCompanion />,
      }),
    ]),
  ),
);
