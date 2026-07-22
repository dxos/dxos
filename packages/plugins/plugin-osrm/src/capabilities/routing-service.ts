//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type Routing, TripCapabilities } from '@dxos/plugin-trip/types';

import { makeOsrmRoutingService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883).
  const service: Routing.RoutingService = makeOsrmRoutingService();
  return Effect.succeed(Capability.provide(TripCapabilities.RoutingService, service));
});
