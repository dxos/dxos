//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import { BookingOperation, RoutingOperation, TripOperation } from '#types';

export * from './extractor';

export const TripOperationHandlerSet = OperationHandlerSet.lazy([
  TripOperation.ExtractTrip.pipe(Operation.lazyHandler(() => import('./extractor/trip-extractor'))),
  TripOperation.MergeTrip.pipe(Operation.lazyHandler(() => import('./merge-trip'))),
  RoutingOperation.PlanRoute.pipe(Operation.lazyHandler(() => import('./plan-route'))),
  BookingOperation.SearchBookings.pipe(Operation.lazyHandler(() => import('./search-bookings'))),
  TripOperation.CreateTripFromEvents.pipe(Operation.lazyHandler(() => import('./create-trip-from-events'))),
  TripOperation.AddSegment.pipe(Operation.lazyHandler(() => import('./add-segment'))),
]);
