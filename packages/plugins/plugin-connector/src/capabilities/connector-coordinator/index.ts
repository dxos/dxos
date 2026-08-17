//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';

import { ConnectorCoordination } from '#types';

// Browser-only, with `OAuthRedirect` which requires it: coordination drives an interactive OAuth
// flow through the shell, and main's node variant carried neither.
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
