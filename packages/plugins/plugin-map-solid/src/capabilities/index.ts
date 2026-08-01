//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { MapSolidEvents } from '../events';

export const Surface = AppCapability.surface(() => import('./surface'), {
  activatesOn: MapSolidEvents.Start,
});
