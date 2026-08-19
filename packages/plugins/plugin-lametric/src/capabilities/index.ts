//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { LaMetricCapabilities } from '#types';

export const LaMetricSettings = AppCapability.settings(() => import('./settings'), {
  provides: [LaMetricCapabilities.SettingsAtom],
});
