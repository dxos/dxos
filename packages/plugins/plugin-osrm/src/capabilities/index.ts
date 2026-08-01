//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { TripCapabilities, TripEvents } from '@dxos/plugin-trip/types';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService], activatesOn: TripEvents.Start },
  () => import('./routing-service'),
);
