//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { DebugOperationHandlerSet } from '#operations';

export const OperationHandler = AppCapability.operationHandler(
  Effect.fnUntraced(function* () {
    setupDevtools();
    return Capability.contribute(Capabilities.OperationHandler, DebugOperationHandlerSet.handlers);
  }),
);

// Console sugar for the snapshot operation (see app-framework/docs/INTROSPECTION.md §3.1).
const setupDevtools = () => {
  const composer = (globalThis.composer ??= {});
  // `input` passes through, so a caller can scope the error window (`{ since }`).
  composer.snapshot = (input: { since?: number } = {}) => composer.invoke?.('org.dxos.operation.debug.snapshot', input);
};
