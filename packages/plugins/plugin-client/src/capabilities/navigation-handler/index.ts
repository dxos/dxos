//
// Copyright 2025 DXOS.org
//

import { Capabilities } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';

import { type NavigationHandlerOptions } from './navigation-handler';

export type { NavigationHandlerOptions } from './navigation-handler';

// Annotated so the emitted `.d.ts` names the requires via `typeof` instead of expanding
// operation types this package does not depend on (TS2883).
export const NavigationHandler: AppCapability.NavigationHandlerModule<
  NavigationHandlerOptions,
  readonly [typeof Capabilities.OperationInvoker]
> = AppCapability.navigationHandler(() => import('./navigation-handler'), {
  requires: [Capabilities.OperationInvoker],
});
