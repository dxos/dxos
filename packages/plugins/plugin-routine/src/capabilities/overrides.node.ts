//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

// Node-specific implementations spliced into the generated barrel by `dx-plugin gen` in place of
// the canonical declarations.

// Schema: the headless environments register the reduced schema list rather than the browser
// `./schema` module.
export const Schema = AppCapability.schema(() => import('../schema.headless'));

// OperationHandler: carried over unchanged from the former `capabilities/node.ts`, which built
// this module by hand instead of via the `AppCapability.operationHandler` maker the canonical
// declaration uses — omitting `activatesOn` here defaults it to the idle wave, whereas the maker
// forces Startup. Flagged, not fixed: this timing divergence needs a human decision on whether
// node's operation handlers were meant to register later than browser's/workerd's.
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('../operation-handler'),
);
