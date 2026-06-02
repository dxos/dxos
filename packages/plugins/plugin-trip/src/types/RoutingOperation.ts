//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

import * as Routing from './Routing';

const makeKey = (name: string) => DXN.make(`${meta.id}.operation.${name}`);

/**
 * Plans a driving route through an ordered list of cities. Resolves the registered
 * `RoutingService` (e.g. plugin-osrm), calls `route()`, and reconciles the trip's planner-owned
 * road `Segment`s to match the returned legs — replacing exactly the previous planner-generated run
 * while leaving non-road segments and hand-added road segments untouched. The city list is supplied
 * by the caller (the Route section UI); it is not persisted on the Trip.
 */
export const PlanRoute = Operation.make({
  meta: {
    key: makeKey('planRoute'),
    name: 'Plan route',
    description: 'Compute driving routes between an ordered list of cities and add them to the trip.',
    icon: 'ph--path--regular',
  },
  // The Trip is passed as the live ECHO object (validated/narrowed in the handler).
  input: Schema.Struct({
    trip: Schema.Any,
    waypoints: Schema.Array(Routing.Waypoint),
    provider: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    legs: Schema.Number,
    distanceMeters: Schema.Number,
    durationSeconds: Schema.Number,
  }),
  services: [Capability.Service],
});
