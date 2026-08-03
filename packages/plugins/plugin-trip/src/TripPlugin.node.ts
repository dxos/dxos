//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { meta } from '#meta';

import * as Booking from './types/Booking';
import * as Trip from './types/Trip';

export const TripPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppCapability.schema([Trip.Trip, Booking.Booking])),
  Plugin.make,
);

export default TripPlugin;
