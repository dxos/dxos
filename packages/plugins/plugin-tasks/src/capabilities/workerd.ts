//
// Copyright 2026 DXOS.org
//

import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactSurface`, and
// a bundler follows the dynamic import behind a lazy capability — so importing it at all pulls the
// React surface into a worker bundle that cannot load it.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
