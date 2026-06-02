//
// Copyright 2026 DXOS.org
//

import { OperationHandlerSet } from '@dxos/compute';

export * from './extractor';

export const TripOperationHandlerSet = OperationHandlerSet.lazy(
  () => import('./extractor/trip-extractor'),
  () => import('./merge-trip'),
  () => import('./search-bookings'),
);
