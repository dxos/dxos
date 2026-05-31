//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';

import { BookingSearch, TripCapabilities } from '../types';
import handler from './search-bookings';

const FLIGHT_OFFER: BookingSearch.FlightOffer = {
  _tag: 'flight' as const,
  id: 'off_1',
  provider: 'stub',
  operator: { name: 'Stub Air' },
  totalAmount: 100,
  currency: 'USD',
  slices: [{ origin: { code: 'JFK' }, destination: { code: 'LHR' } }],
};

// Stub BookingService that always returns a single flight offer.
const stubBookingService = (): BookingSearch.BookingService => ({
  id: 'duffel',
  label: 'duffel',
  kinds: ['flight'],
  search: async () => [FLIGHT_OFFER],
});

// Build a Capability.Service from a list of BookingService instances.
const makeCapabilityService = (services: BookingSearch.BookingService[]) => {
  const registry = Registry.make();
  const manager = CapabilityManager.make({ registry });
  for (const service of services) {
    manager.contribute({
      interface: TripCapabilities.BookingService,
      implementation: service,
      module: service.id,
    });
  }
  return manager;
};

const FLIGHT_QUERY: BookingSearch.SearchQuery = { _tag: 'flight' };

describe('SearchBookings operation handler', () => {
  test('returns offers from a matching service', async ({ expect }) => {
    const capabilityService = makeCapabilityService([stubBookingService()]);

    const result = await handler
      .handler({ query: FLIGHT_QUERY })
      .pipe(Effect.provideService(Capability.Service, capabilityService))
      .pipe(Effect.runPromise);

    expect(result.offers).toHaveLength(1);
    expect(result.offers[0].id).toBe('off_1');
  });

  test('returns no offers when no services are registered', async ({ expect }) => {
    const capabilityService = makeCapabilityService([]);

    const result = await handler
      .handler({ query: FLIGHT_QUERY })
      .pipe(Effect.provideService(Capability.Service, capabilityService))
      .pipe(Effect.runPromise);

    expect(result.offers).toEqual([]);
  });
});
