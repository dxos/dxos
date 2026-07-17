//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';

import { FactsCompanion } from '#containers';
import { BrainSurface } from '#types';

/** React surfaces contributed by plugin-brain — the standalone per-space facts panel. */
export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.provide(Capabilities.ReactSurface, [
      Surface.create({
        id: 'brain.facts',
        filter: Surface.makeFilter(BrainSurface.Facts),
        component: () => <FactsCompanion />,
      }),
    ]),
  ]),
);
