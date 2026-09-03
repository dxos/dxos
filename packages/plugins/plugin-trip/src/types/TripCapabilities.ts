//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as BookingSearch from './BookingSearch.ts';
import type * as Routing from './Routing.ts';

/**
 * Plugins contribute booking providers via this capability. Multiple plugins
 * may register; `BookingSearch` resolves all contributions and filters them by
 * the segment kind being searched.
 */
export const BookingService = Capability.make<BookingSearch.BookingService>()(
  `${meta.profile.key}.capability.bookingService`,
);

/**
 * Plugins contribute driving-route providers via this capability (e.g. plugin-osrm). `PlanRoute`
 * resolves all contributions and uses the first (or the one matching the requested provider id).
 */
export const RoutingService = Capability.makeSingleton<Routing.RoutingService>()(
  `${meta.profile.key}.capability.routingService`,
);
