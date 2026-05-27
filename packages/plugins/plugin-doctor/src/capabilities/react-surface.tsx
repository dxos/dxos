//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DiagnosticsPanel } from '#containers';

import { DIAGNOSTICS_DECK_COMPANION_ID } from './app-graph-builder';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'doctor-diagnostics',
        filter: AppSurface.literal(
          Surface.makeType<{ subject: string }>(`deck-companion--${DIAGNOSTICS_DECK_COMPANION_ID}`),
          DIAGNOSTICS_DECK_COMPANION_ID,
        ),
        component: () => <DiagnosticsPanel />,
      }),
    ]),
  ),
);
