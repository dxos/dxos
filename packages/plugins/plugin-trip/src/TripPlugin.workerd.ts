//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { meta } from '#meta';
import { Booking, Trip } from '#types';

export const TripPlugin = Plugin.define(meta).pipe(
  Plugin.addLazyModule(AppCapability.schema([Trip.Trip, Booking.Booking])),
  Plugin.make,
);

export default TripPlugin;
