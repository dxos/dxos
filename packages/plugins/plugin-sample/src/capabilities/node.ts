//
// Copyright 2025 DXOS.org
//

// Node/CLI capabilities entry point.
// Only exports capabilities that work in headless environments (no React, no browser APIs).
// The `#capabilities` import resolves to this file in Node.js contexts.

import { Capabilities, Capability } from '@dxos/app-framework';
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
