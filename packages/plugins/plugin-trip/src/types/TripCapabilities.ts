//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';
import type { BookingService as BookingServiceType } from './BookingSearch';

/**
 * Plugins contribute booking providers via this capability. Multiple plugins
 * may register; `BookingSearch` resolves all contributions and filters them by
 * the segment kind being searched.
 */
export const BookingService = Capability.make<BookingServiceType>(`${meta.id}.capability.bookingService`);
