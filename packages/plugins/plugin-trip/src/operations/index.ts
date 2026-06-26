//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';

export const TripOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./extractor/trip-extractor'),
  () => import('./merge-trip'),
  () => import('./plan-route'),
  () => import('./search-bookings'),
  () => import('./create-trip-from-events'),
  () => import('./add-segment'),
);
