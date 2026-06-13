//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { BookingOperation, RoutingOperation, TripOperation } from '#types';

import { TRIP_BLUEPRINT_KEY } from './keys';

const operations = [TripOperation.AddSegment, RoutingOperation.PlanRoute, BookingOperation.SearchBookings];

const make = () =>
  Blueprint.make({
    key: TRIP_BLUEPRINT_KEY,
    name: 'Trip',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You help plan a travel itinerary and find bookings for it.

        Planning: the trip's bound object may already contain "activity" segments — fixed
        appointments at specific addresses, ordered by time. Fill in the connections between them.
        For each gap between two consecutive activities in different places, add a "road" segment
        (subKind transfer/car) from the first place to the second using the add-segment tool. When
        consecutive activities span an overnight stay, add an "accommodation" segment near the
        relevant activity with sensible check-in/check-out times. Use the plan-route tool to compute
        driving routes once road segments exist. Keep segments in chronological order and reuse the
        activities' addresses as origins/destinations.

        Bookings: use the search-bookings tool to find travel (flights first). Set the query _tag to
        'flight' and provide origin and destination as IATA codes (e.g. JFK, LHR), a departureDate
        (ISO date), and optionally serviceClass ('economy' | 'premium' | 'business' | 'first') and
        passengers. Pass a provider id only if the user named a specific provider. Summarize the
        returned offers (operator, route, price).

        Never invent booking confirmation codes or prices, and do not fabricate offers.
      `,
    }),
  });

const blueprint: Blueprint.Definition = { key: TRIP_BLUEPRINT_KEY, make };

export default blueprint;
