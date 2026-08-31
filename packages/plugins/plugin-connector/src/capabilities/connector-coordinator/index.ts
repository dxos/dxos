//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ConnectorCoordination } from '#types';

// Coordination drives an interactive OAuth flow through the shell, as does `OAuthRedirect`, which
// requires it.
export const Coordinator = Capability.lazyModule(
  'ConnectorCoordination.ConnectorCoordinator',
  {
    environments: [],
    requires: [
      ClientCapabilities.Client,
      ClientCapabilities.IdentityService,
      Capabilities.OperationInvoker,
      Capabilities.ServiceResolver,
    ],
    provides: [ConnectorCoordination.ConnectorCoordinator],
  },
  () => import('./connector-coordinator'),
);
