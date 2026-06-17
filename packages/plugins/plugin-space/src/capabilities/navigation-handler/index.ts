//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';

import { type NavigationHandlerOptions } from './navigation-handler';

export type { NavigationHandlerOptions } from './navigation-handler';

// Explicit annotation prevents TS2883: the module contributes AppCapabilities.Settings whose type
// traces to an internal source path that TypeScript cannot name in declaration files.
export const NavigationHandler: Capability.LazyCapability<NavigationHandlerOptions | undefined> = Capability.lazy(
  'NavigationHandler',
  () => import('./navigation-handler'),
);
