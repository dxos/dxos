//
// Copyright 2025 DXOS.org
//

// Node/CLI capabilities entry point.
// Only exports capabilities that work in headless environments (no React, no browser APIs).
// The `#capabilities` import resolves to this file in Node.js contexts.

import { Capability } from '@dxos/app-framework';
import { type OperationHandlerSet } from '@dxos/operation';

export const OperationHandler = Capability.lazy<OperationHandlerSet.OperationHandlerSet>(
  'OperationHandler',
  () => import('./operation-handler'),
);
