//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactSurface` and a
// bundler follows the dynamic import behind a lazy capability — so importing it at all pulls the
// React surface, and the `.pcss` assets behind it, into a worker bundle that cannot load them.
// The browser and node entries keep using the full barrel via the `default` condition.

export const Schema = AppCapability.schema(() => import('./schema'));
export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'), {
  activatesOn: ActivationEvents.Idle,
});
