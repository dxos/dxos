//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A booking service rejected the search request for a reason it did not name. */
export class BookingSearchError extends BaseError.extend('BookingSearchError', 'Booking search failed.') {}

/** A routing service rejected the route request for a reason it did not name. */
export class RoutePlanError extends BaseError.extend('RoutePlanError', 'Route planning failed.') {}
