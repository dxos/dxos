//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { AppCapabilities } from '@dxos/app-toolkit';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import type { OperationInvoker } from '@dxos/operation';

export type { NavigationHandlerOptions } from './navigation-handler';

export const NavigationHandler = Capability.lazyModule(
  'NavigationHandler',
  { requires: [Capabilities.OperationInvoker], provides: [AppCapabilities.NavigationHandler] },
  () => import('./navigation-handler'),
);
