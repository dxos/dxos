//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type NavigationHandlerOptions } from './navigation-handler';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler: Capability.LazyCapability<NavigationHandlerOptions | undefined> = Capability.lazy(
  'NavigationHandler',
  () => import('./navigation-handler'),
);
