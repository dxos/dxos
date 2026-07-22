//
// Copyright 2026 DXOS.org
//

import { Capabilities, Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';

import { ConnectorCoordinator } from '#types';

export const Coordinator = Capability.lazyModule(
  'ConnectorCoordinator',
  { requires: [ClientCapabilities.Client, Capabilities.OperationInvoker], provides: [ConnectorCoordinator] },
  () => import('./connector-coordinator'),
);
