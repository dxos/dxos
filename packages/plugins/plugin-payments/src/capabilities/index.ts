//
// Copyright 2026 DXOS.org
//

import { AppCapability } from '@dxos/app-toolkit';

import { PaymentsCapabilities } from '#types';

export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [PaymentsCapabilities.Settings],
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'));
