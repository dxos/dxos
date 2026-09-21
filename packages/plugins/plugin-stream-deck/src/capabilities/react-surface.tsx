//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { StreamDeckDashboardSurface, StreamDeckStatusSurface } from './StreamDeckSurfaces.tsx';

export const ReactSurface = AppCapability.surface(
  () =>
    Effect.succeed([
      Capability.contribute(Capabilities.ReactSurface, [
        Surface.create({
          id: 'deckCompanion',
          filter: Surface.makeFilter(AppSurface.deckCompanion('streamDeck')),
          component: StreamDeckDashboardSurface,
        }),
        Surface.create({
          id: 'statusIndicator',
          filter: Surface.makeFilter(AppSurface.StatusIndicator),
          component: StreamDeckStatusSurface,
        }),
      ]),
    ]),
  {
    roles: ['org.dxos.role.deckCompanion.streamDeck', 'org.dxos.role.statusIndicator'],
  },
);
