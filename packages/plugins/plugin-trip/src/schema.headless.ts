//
// Copyright 2026 DXOS.org
//

import { Booking, Trip } from '#types';

/**
 * Schemas this plugin registers, loaded on demand: the capability activates at idle,
 * so naming them here keeps them out of the plugin body's module graph.
 *
 * Reduced list carried over unchanged from the former `schema.node.ts` / `schema.workerd.ts`
 * (identical to each other) — it is missing `Segment.Segment` relative to the full canonical
 * `./capabilities/schema.ts` list. Flagged, not fixed: this needs a human decision on whether
 * headless environments should register the full set.
 */
export default [Trip.Trip, Booking.Booking];
