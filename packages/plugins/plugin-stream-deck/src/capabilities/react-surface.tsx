//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';

import { StreamDeckDashboardSurface, StreamDeckStatusSurface } from './StreamDeckSurfaces';

export default Capability.makeModule(() =>
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
);
