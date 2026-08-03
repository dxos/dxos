//
// Copyright 2026 DXOS.org
//

import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';

import * as BookingOperation from '../types/BookingOperation';
import * as RoutingOperation from '../types/RoutingOperation';
import * as TripOperation from '../types/TripOperation';

export * from './extractor';

export const TripOperationHandlerSet = OperationHandlerSet.keyed([
  [TripOperation.ExtractTrip, () => import('./extractor/trip-extractor')],
  [TripOperation.MergeTrip, () => import('./merge-trip')],
  [RoutingOperation.PlanRoute, () => import('./plan-route')],
  [BookingOperation.SearchBookings, () => import('./search-bookings')],
  [TripOperation.CreateTripFromEvents, () => import('./create-trip-from-events')],
  [TripOperation.AddSegment, () => import('./add-segment')],
]);
