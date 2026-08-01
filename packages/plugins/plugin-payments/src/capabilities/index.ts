//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { PaymentsCapabilities, PaymentsEvents } from '#types';

export const Settings = AppCapability.settings(() => import('./settings'), {
  provides: [PaymentsCapabilities.Settings],
  activatesOn: PaymentsEvents.Start,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
