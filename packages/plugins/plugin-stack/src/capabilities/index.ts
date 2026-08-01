//
// Copyright 2025 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { StackEvents } from '#types';

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  activatesOn: StackEvents.Start,
});
