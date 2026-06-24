//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

import * as BookingSearch from './BookingSearch';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Searches for bookings (flights, …) across the enabled `BookingService`s. The handler resolves
 * all contributed services, filters by the query kind and optional provider id, and returns the
 * matching service's offers. Exposed to the assistant via the booking skill.
 */
export const SearchBookings = Operation.make({
  meta: {
    key: makeKey('searchBookings'),
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
