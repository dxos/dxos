//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

export const Surface = AppCapability.surface(() => import('./surface'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
