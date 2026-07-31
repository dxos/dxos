//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';

import { CallsCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager],
});
export const CallManager = Capability.lazyModule(
  'CallManager',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, ClientCapabilities.IdentityService],
    provides: [CallsCapabilities.Manager],
  },
  () => import('./call-manager'),
);
export const CallTransport = Capability.lazyModule(
  'CallTransport',
  { requires: [ClientCapabilities.Client], provides: [CallsCapabilities.CallTransportProvider] },
  () => import('./call-transport'),
);
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'));
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.deckCompanion.activeCall', 'org.dxos.role.devtoolsOverview'],
});
