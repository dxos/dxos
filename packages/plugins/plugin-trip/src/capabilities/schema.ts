//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { Booking, Segment, Trip } from '#types';

export const Schema = AppCapability.schema([Trip.Trip, Segment.Segment, Booking.Booking]);
