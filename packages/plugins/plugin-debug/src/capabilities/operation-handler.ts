//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';

import { DebugOperationHandlerSet } from '#operations';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    setupDevtools();
    return Capability.contribute(Capabilities.OperationHandler, DebugOperationHandlerSet.handlers);
  }),
);

// Console sugar for the snapshot operation (see app-framework/docs/INTROSPECTION.md §3.1).
const setupDevtools = () => {
  const composer = (globalThis.composer ??= {});
  composer.snapshot = () => composer.invoke?.('org.dxos.operation.debug.snapshot', {});
};
