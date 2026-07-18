//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationHandlerSet } from '@dxos/compute';
import { Connector as ConnectorCapability } from '@dxos/plugin-connector';

export const Connector = Capability.lazyModule(
  'SlackConnector',
  { provides: [ConnectorCapability] },
  () => import('./connector'),
);
export const OperationHandler = Capability.lazyModule(
  'OperationHandler',
  { provides: [Capabilities.OperationHandler] },
  () => import('./operation-handler'),
);
