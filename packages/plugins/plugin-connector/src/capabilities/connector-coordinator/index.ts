//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
// Explicit import so the emitted `.d.ts` references the package via its public
// alias instead of a relative `node_modules` path (TS2883).
// eslint-disable-next-line unused-imports/no-unused-imports
import type { OperationInvoker } from '@dxos/operation';
import { ClientCapabilities } from '@dxos/plugin-client';

import { ConnectorCoordinator } from '#types';

export const Coordinator = Capability.lazyModule(
  'ConnectorCoordinator',
  { requires: [ClientCapabilities.Client, Capabilities.OperationInvoker], provides: [ConnectorCoordinator] },
  () => import('./connector-coordinator'),
);
