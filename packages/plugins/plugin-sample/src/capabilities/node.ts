//
// Copyright 2025 DXOS.org
//

// Node/CLI capabilities entry point.
// Only exports capabilities that work in headless environments (no React, no browser APIs).
// The `#capabilities` import resolves to this file in Node.js contexts.

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
import { type OperationHandlerSet } from '@dxos/compute';
import { SpaceCapabilities } from '@dxos/plugin-space';

export const CreateObject = Capability.lazyModule(
  'CreateObject',
  { provides: [SpaceCapabilities.CreateObjectEntry] },
  () => import('./create-object'),
);

export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
