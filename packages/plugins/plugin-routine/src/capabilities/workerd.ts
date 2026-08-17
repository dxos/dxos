//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { RoutineCapabilities } from '#types';

// Server-safe `#capabilities` barrel: only the modules the workerd entry activates. Declared here
// rather than re-exported from `./index.ts`, because that barrel also declares `ReactSurface`, and
// a bundler follows the dynamic import behind a lazy capability — so importing it at all pulls the
// React surface, and the `.pcss` assets behind it, into a worker bundle that cannot load them.

export const OperationHandler = AppCapability.operationHandler(() => import('./operation-handler'));
// CreateRoutine (in OperationHandler) resolves RoutineCapabilities.Template, so the template
// provider must be present wherever the handler is exported.
export const Templates = Capability.lazyModule(
  'Templates',
  { provides: [RoutineCapabilities.Template] },
  () => import('./templates'),
);
