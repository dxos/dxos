//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as Routing from '@dxos/plugin-trip/Routing';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';

import { makeOsrmRoutingService } from '#services';

export const RoutingService = Capability.makeModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService], activatesOn: TripEvents.Start },
  () => {
    // Explicit type keeps the emitted declaration portable (TS2883).
    const service: Routing.RoutingService = makeOsrmRoutingService();
    return Effect.succeed(Capability.contribute(TripCapabilities.RoutingService, service));
  },
);
