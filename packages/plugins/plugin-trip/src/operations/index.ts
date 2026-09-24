//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { BookingOperation, RoutingOperation, TripOperation } from '#types';

export * from './extractor/index.ts';

export const TripOperationHandlerSet = OperationHandlerSet.lazy([
  TripOperation.ExtractTrip.pipe(Operation.lazyHandler(() => import('./extractor/trip-extractor.ts'))),
  TripOperation.MergeTrip.pipe(Operation.lazyHandler(() => import('./merge-trip.ts'))),
  RoutingOperation.PlanRoute.pipe(Operation.lazyHandler(() => import('./plan-route.ts'))),
  BookingOperation.SearchBookings.pipe(Operation.lazyHandler(() => import('./search-bookings.ts'))),
  TripOperation.CreateTripFromEvents.pipe(Operation.lazyHandler(() => import('./create-trip-from-events.ts'))),
  TripOperation.AddSegment.pipe(Operation.lazyHandler(() => import('./add-segment.ts'))),
]);
