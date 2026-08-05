//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { TripCapabilities } from '@dxos/plugin-trip/types';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService] },
  () => import('./routing-service'),
);
