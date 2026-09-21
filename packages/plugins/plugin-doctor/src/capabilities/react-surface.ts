//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { DiagnosticsPanel } from '#containers';

import { DIAGNOSTICS_DECK_COMPANION_ID } from './app-graph-builder.ts';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed(
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'doctorDiagnostics',
          filter: AppSurface.literal(
            AppSurface.deckCompanion(DIAGNOSTICS_DECK_COMPANION_ID),
            DIAGNOSTICS_DECK_COMPANION_ID,
          ),
          component: DiagnosticsPanel,
        }),
      ]),
    ),
  {
    roles: ['org.dxos.role.deckCompanion.diagnostics'],
  },
);
