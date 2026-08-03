//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as TripCapabilities from '@dxos/plugin-trip/TripCapabilities';
import * as TripEvents from '@dxos/plugin-trip/TripEvents';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService], activatesOn: TripEvents.Start },
  () => import('./routing-service'),
);
