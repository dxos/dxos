//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Routing } from '@dxos/plugin-trip/types';
import { TripCapabilities } from '@dxos/plugin-trip/types';

export const RoutingService = Capability.lazyModule(
  'RoutingService',
  { provides: [TripCapabilities.RoutingService] },
  () => import('./routing-service'),
);
