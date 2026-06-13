//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { EffectEx } from '@dxos/effect';

import { Booking, Routing, Segment, Trip, TripCapabilities } from '#types';

import { fakeRoutingService } from '../testing/routing';
import planRouteHandler from './plan-route';

const capabilityService = (service?: Routing.RoutingService) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  if (service) {
    manager.contribute({ interface: TripCapabilities.RoutingService, implementation: service, module: service.id });
  }
  return manager;
};

const roadLeg = (from: string, to: string): Segment.Segment =>
  Segment.make({ details: { _tag: 'road', subKind: 'car', origin: { name: from }, destination: { name: to } } });

describe('PlanRoute', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Trip.Trip, Segment.Segment, Booking.Booking] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const addTrip = (segments: Segment.Segment[]): Trip.Trip => {
    const trip = db.add(Trip.make({ name: 'Trip' }));
    for (const segment of segments) {
      db.add(segment);
      Trip.addSegment(trip, segment);
    }
    return trip;
  };

  const plan = (trip: Trip.Trip, service?: Routing.RoutingService) =>
    planRouteHandler
      .handler({ trip })
      .pipe(Effect.provideService(Capability.Service, capabilityService(service)))
      .pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

  test('writes a route (geometry + endpoint geo) onto each road segment', async ({ expect }) => {
    const trip = addTrip([roadLeg('London', 'Avignon'), roadLeg('Avignon', 'Barcelona')]);
    await db.flush();

    const result = await plan(trip, fakeRoutingService());
    expect(result.legs).toBe(2);
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);

    await db.flush();
    const roads = Trip.getSegments(trip).filter((segment) => segment.details._tag === 'road');
    expect(roads).toHaveLength(2);
    for (const segment of roads) {
      if (segment.details._tag === 'road') {
        const route = segment.details.routes?.[0];
        expect(route?.distance).toBeGreaterThan(0);
        expect(route?.legs.length).toBeGreaterThanOrEqual(1);
        expect(route && Routing.routeGeometry(route).length).toBeGreaterThanOrEqual(2);
        expect(segment.details.origin?.geo).toBeDefined();
        expect(segment.details.destination?.geo).toBeDefined();
      }
    }
  });

  test('leaves non-road segments untouched', async ({ expect }) => {
    const flight = Segment.make({ details: { _tag: 'flight', number: 'AF1', departAt: '2026-06-01T10:00:00.000Z' } });
    const trip = addTrip([flight, roadLeg('London', 'Barcelona')]);
    await db.flush();

    const result = await plan(trip, fakeRoutingService());
    expect(result.legs).toBe(1);

    await db.flush();
    const flightSegment = Trip.getSegments(trip).find((segment) => segment.details._tag === 'flight');
    expect(flightSegment?.details._tag).toBe('flight');
    if (flightSegment?.details._tag === 'flight') {
      expect(flightSegment.details.number).toBe('AF1');
    }
  });

  test('skips road segments missing an endpoint', async ({ expect }) => {
    const incomplete = Segment.make({ details: { _tag: 'road', subKind: 'car', origin: { name: 'London' } } });
    const trip = addTrip([incomplete]);
    await db.flush();

    const result = await plan(trip, fakeRoutingService());
    expect(result.legs).toBe(0);
  });

  test('fails when no routing service is registered', async ({ expect }) => {
    const trip = addTrip([roadLeg('London', 'Avignon')]);
    await db.flush();
    await expect(plan(trip)).rejects.toThrow(/No routing service/);
  });

  test('geocoding query prefers geo, then code, then "city, country", then name', async ({ expect }) => {
    const seen: Routing.Waypoint[] = [];
    const recordingService: Routing.RoutingService = {
      id: 'recording',
      label: 'Recording',
      profiles: ['driving'],
      route: async ({ waypoints }) => {
        seen.push(...waypoints);
        return { waypoints: [], routes: [] };
      },
    };

    const segments = [
      // Resolved coordinates win over every string fallback — the Place passes through unchanged.
      Segment.make({
        details: {
          _tag: 'road',
          subKind: 'car',
          origin: { geo: [2.3522, 48.8566], code: 'CDG', city: 'Paris' },
          destination: { geo: [4.8357, 45.764], city: 'Lyon' },
        },
      }),
      // Code wins over city/name; city + country are joined.
      Segment.make({
        details: {
          _tag: 'road',
          subKind: 'car',
          origin: { code: 'CDG', city: 'Paris', name: 'Charles de Gaulle' },
          destination: { city: 'Lyon', country: 'France', name: 'Lyon Part-Dieu' },
        },
      }),
      // City without country falls back to just the city; name is the last resort.
      Segment.make({
        details: { _tag: 'road', subKind: 'car', origin: { city: 'Bath' }, destination: { name: 'Stonehenge' } },
      }),
    ];
    const trip = addTrip(segments);
    await db.flush();

    await plan(trip, recordingService);
    // Geo waypoints pass through as the Place (compared by their coordinates); the rest are query strings.
    const normalized = seen.map((waypoint) => (typeof waypoint === 'string' ? waypoint : waypoint.geo));
    expect(normalized).toEqual([[2.3522, 48.8566], [4.8357, 45.764], 'CDG', 'Lyon, France', 'Bath', 'Stonehenge']);
  });
});
