//
// Copyright 2026 DXOS.org
//

import { Blueprint, Template } from '@dxos/compute';
import { trim } from '@dxos/util';

import { meta } from '#meta';
import { BookingOperation } from '#types';

const BLUEPRINT_KEY = `${meta.id}/blueprint/booking`;

const operations = [BookingOperation.SearchBookings];

const make = () =>
  Blueprint.make({
    key: BLUEPRINT_KEY,
    name: 'Trip Booking Search',
    tools: Blueprint.toolDefinitions({ operations }),
    instructions: Template.make({
      source: trim`
        You help the user find travel bookings (flights first).
        Use the search-bookings tool with a query: set _tag to 'flight' and provide origin and
        destination as IATA codes (e.g. JFK, LHR), a departureDate (ISO date), and optionally
        serviceClass ('economy' | 'premium' | 'business' | 'first') and passengers. Pass a provider
        id only if the user named a specific provider. Summarize the returned offers (operator,
        route, price) for the user; do not fabricate offers.
      `,
    }),
  });

const blueprint: Blueprint.Definition = { key: BLUEPRINT_KEY, make };

export default blueprint;
