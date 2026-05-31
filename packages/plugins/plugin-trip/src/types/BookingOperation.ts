//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';

import { meta } from '#meta';
import * as BookingSearch from './BookingSearch';

const BOOKING_OPERATION = `${meta.id}.operation`;

/**
 * Searches for bookings (flights, …) across the enabled `BookingService`s. The handler resolves
 * all contributed services, filters by the query kind and optional provider id, and returns the
 * matching service's offers. Exposed to the assistant via the booking blueprint.
 */
export const SearchBookings = Operation.make({
  meta: {
    key: `${BOOKING_OPERATION}.search-bookings`,
    name: 'Search Bookings',
    description: 'Search for flights (and other bookings) across the enabled booking providers.',
    icon: 'ph--magnifying-glass--regular',
  },
  input: Schema.Struct({
    query: BookingSearch.SearchQuery,
    provider: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    offers: Schema.Array(BookingSearch.Offer),
  }),
  services: [Capability.Service],
});
