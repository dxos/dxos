//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';

import { StreamDeckDashboardSurface, StreamDeckStatusSurface } from './StreamDeckSurfaces.tsx';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'deckCompanion',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('streamDeck')),
        component: StreamDeckDashboardSurface,
      }),
      Surface.Root.create({
        id: 'statusIndicator',
        filter: Surface.Root.makeFilter(AppSurface.StatusIndicator),
        component: StreamDeckStatusSurface,
      }),
    ]),
  ]),
);
