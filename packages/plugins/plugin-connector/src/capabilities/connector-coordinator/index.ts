//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import * as ConnectorCoordination from '../../types/ConnectorCoordination';

export const Coordinator = Capability.lazyModule(
  'ConnectorCoordination.ConnectorCoordinator',
  {
    requires: [ClientCapabilities.Client, Capabilities.OperationInvoker, Capabilities.ServiceResolver],
    provides: [ConnectorCoordination.ConnectorCoordinator],
  },
  () => import('./connector-coordinator'),
);
