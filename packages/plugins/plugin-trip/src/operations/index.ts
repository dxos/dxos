//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

import { RoutingOperation } from '#types';

import { TripOperation } from '../types';
import { BookingOperation } from '../types';

export * from './extractor';

export const TripOperationHandlerSet = OperationHandlerSet.keyed([
  [TripOperation.ExtractTrip, () => import('./extractor/trip-extractor')],
  [TripOperation.MergeTrip, () => import('./merge-trip')],
  [RoutingOperation.PlanRoute, () => import('./plan-route')],
  [BookingOperation.SearchBookings, () => import('./search-bookings')],
  [TripOperation.CreateTripFromEvents, () => import('./create-trip-from-events')],
  [TripOperation.AddSegment, () => import('./add-segment')],
]);
