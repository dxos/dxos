//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { BookingOperation, RoutingOperation, TripOperation } from '#types';

import { TRIP_PLANNING_BLUEPRINT_KEY } from './keys';

const operations = [TripOperation.AddSegment, RoutingOperation.PlanRoute, BookingOperation.SearchBookings];

const make = () =>
  Blueprint.make({
    key: TRIP_PLANNING_BLUEPRINT_KEY,
    name: 'Trip Planning',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You help plan a travel itinerary. The trip's bound object already contains "activity"
        segments: fixed appointments at specific addresses, ordered by time. Your job is to fill in
        the connections between them.

        For each gap between two consecutive activities in different places, add a "road" segment
        (subKind transfer/car) from the first place to the second using the add-segment tool. When
        consecutive activities span an overnight stay, add an "accommodation" segment near the
        relevant activity with sensible check-in/check-out times.

        Use the plan-route tool to compute driving routes once road segments exist, and the
        search-bookings tool to surface transport options when the user asks. Never invent booking
        confirmation codes or prices. Keep segments in chronological order and reuse the activities'
        addresses as origins/destinations.
      `,
    }),
  });

const blueprint: Blueprint.Definition = { key: TRIP_PLANNING_BLUEPRINT_KEY, make };

export default blueprint;
