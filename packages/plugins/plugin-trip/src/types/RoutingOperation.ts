//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Capability } from '@dxos/app-framework';
import { Operation } from '@dxos/compute';
import { DXN } from '@dxos/keys';

import { meta } from '#meta';

const makeKey = (name: string) => DXN.make(`${meta.profile.key}.operation.${name}`);

/**
 * Computes driving routes for a trip's `road` segments. Resolves the registered `RoutingService`
 * (e.g. plugin-osrm) and, for each road segment with an origin and destination, geocodes the stops
 * and writes the driving distance, duration, and polyline geometry back onto that segment. The
 * segments themselves are the source of truth (added/edited via the normal segment flow); this
 * operation only enriches them — it does not create or delete segments.
 */
export const PlanRoute = Operation.make({
  meta: {
    key: makeKey('planRoute'),
    name: 'Plan route',
    description: 'Compute driving routes between the cities on the trip’s road segments.',
    icon: 'ph--path--regular',
  },
  // The Trip is passed as the live ECHO object (validated/narrowed in the handler).
  input: Schema.Struct({
    trip: Schema.Any,
    provider: Schema.optional(Schema.String),
  }),
  output: Schema.Struct({
    legs: Schema.Number,
    distanceMeters: Schema.Number,
    durationSeconds: Schema.Number,
  }),
  services: [Capability.Service],
});
