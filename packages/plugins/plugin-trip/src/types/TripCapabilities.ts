//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';
import type * as BookingSearch from './BookingSearch';

/**
 * Plugins contribute booking providers via this capability. Multiple plugins
 * may register; `BookingSearch` resolves all contributions and filters them by
 * the segment kind being searched.
 */
export const BookingService = Capability.make<BookingSearch.BookingService>(`${meta.id}.capability.bookingService`);
