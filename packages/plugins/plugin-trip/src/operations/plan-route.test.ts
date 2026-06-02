//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Capability, CapabilityManager } from '@dxos/app-framework';
import { Database } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-db';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { runAndForwardErrors } from '@dxos/effect';

import { fakeRoutingService } from '../testing/routing';
import { Booking, type Routing, Segment, Trip, TripCapabilities } from '../types';
import planRouteHandler from './plan-route';

const capabilityService = (service?: Routing.RoutingService) => {
  const manager = CapabilityManager.make({ registry: Registry.make() });
  if (service) {
    manager.contribute({ interface: TripCapabilities.RoutingService, implementation: service, module: service.id });
  }
  return manager;
};

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

  const plan = (trip: Trip.Trip, waypoints: Routing.Waypoint[], service?: Routing.RoutingService) =>
    planRouteHandler
      .handler({ trip, waypoints })
      .pipe(Effect.provideService(Capability.Service, capabilityService(service)))
      .pipe(Effect.provide(Database.layer(db)), runAndForwardErrors);

  test('first plan appends a planned road segment per leg with route fields set', async ({ expect }) => {
    const trip = db.add(Trip.make({ name: 'Road trip' }));
    await db.flush();

    const result = await plan(trip, ['London', 'Avignon', 'Barcelona'], fakeRoutingService());
    expect(result.legs).toBe(2);
    expect(result.distanceMeters).toBeGreaterThan(0);
    expect(result.durationSeconds).toBeGreaterThan(0);

    await db.flush();
    const segments = Trip.getSegments(trip);
    expect(segments).toHaveLength(2);
    for (const segment of segments) {
      expect(Segment.isPlannedRoad(segment)).toBe(true);
      if (segment.details._tag === 'road') {
        expect(segment.details.distanceMeters).toBeGreaterThan(0);
        expect(segment.details.path?.length).toBe(2);
      }
    }
    expect(Segment.getOrigin(segments[0])?.name).toBe('London');
    expect(Segment.getDestination(segments[1])?.name).toBe('Barcelona');
  });

  test('re-plan replaces planner-owned legs but preserves other segments', async ({ expect }) => {
    const trip = db.add(Trip.make({ name: 'Mixed' }));
    const flight = db.add(
      Segment.make({ details: { _tag: 'flight', number: 'AF1', departAt: '2026-06-01T10:00:00.000Z' } }),
    );
    Trip.addSegment(trip, flight);
    const taxi = db.add(Segment.make({ details: { _tag: 'road', subKind: 'taxi' } }));
    Trip.addSegment(trip, taxi);
    await db.flush();

    await plan(trip, ['London', 'Avignon', 'Barcelona'], fakeRoutingService());
    await db.flush();
    let segments = Trip.getSegments(trip);
    expect(segments).toHaveLength(4);
    expect(segments.filter(Segment.isPlannedRoad)).toHaveLength(2);

    await plan(trip, ['London', 'Barcelona'], fakeRoutingService());
    await db.flush();
    segments = Trip.getSegments(trip);
    expect(segments.filter(Segment.isPlannedRoad)).toHaveLength(1);
    expect(segments.filter((segment) => segment.details._tag === 'flight')).toHaveLength(1);
    // The hand-added taxi (planned !== true) survives.
    expect(
      segments.filter((segment) => segment.details._tag === 'road' && segment.details.planned !== true),
    ).toHaveLength(1);
  });

  test('fails when no routing service is registered', async ({ expect }) => {
    const trip = db.add(Trip.make({ name: 'X' }));
    await db.flush();
    await expect(plan(trip, ['London', 'Avignon'])).rejects.toThrow(/No routing service/);
  });

  test('clears the planned run when fewer than two waypoints remain', async ({ expect }) => {
    const trip = db.add(Trip.make({ name: 'Shrink' }));
    await db.flush();
    await plan(trip, ['London', 'Avignon'], fakeRoutingService());
    await db.flush();
    expect(Trip.getSegments(trip).filter(Segment.isPlannedRoad)).toHaveLength(1);

    await plan(trip, ['London'], fakeRoutingService());
    await db.flush();
    expect(Trip.getSegments(trip).filter(Segment.isPlannedRoad)).toHaveLength(0);
  });
});
