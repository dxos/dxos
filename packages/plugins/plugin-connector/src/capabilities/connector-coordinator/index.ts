//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';

import { ConnectorCoordinator } from '#types';

export const Coordinator = Capability.lazyModule(
  'ConnectorCoordinator',
  {
    requires: [ClientCapabilities.Client, Capabilities.OperationInvoker, Capabilities.ServiceResolver],
    provides: [ConnectorCoordinator],
  },
  () => import('./connector-coordinator'),
);
