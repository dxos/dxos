//
// Copyright 2026 DXOS.org
//

import { BaseError } from '@dxos/errors';

/** A booking service rejected the search or route request for a reason it did not name. */
export class BookingSearchError extends BaseError.extend('BookingSearchError', 'Booking search failed.') {}
