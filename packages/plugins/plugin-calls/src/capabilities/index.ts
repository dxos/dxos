//
// Copyright 2026 DXOS.org
//

import * as ActivationEvent from '@dxos/app-framework/ActivationEvent';
import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client';

import * as CallsCapabilities from '../types/CallsCapabilities';
import * as CallsEvents from '../types/CallsEvents';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  requires: [CallsCapabilities.Manager],
  // The manager provider rides the client-initialized event, so the feature demand alone is
  // not enough for the pull to find it.
  activatesOn: ActivationEvent.allOf(CallsEvents.Start, ClientEvents.Initialized),
});
// CallManager/CallTransport move as a set with the ReactRoot: its components read the manager
// via strict useCapability, so the three must share an activation event. The manager's
// constructor and open() read `client.services`/`client.config` (initialized-only), which the
// startup pass no longer implies — the trio rides the client-initialized event instead.
export const CallManager = Capability.lazyModule(
  'CallManager',
  {
    requires: [ClientCapabilities.Client, Capabilities.AtomRegistry, ClientCapabilities.IdentityService],
    provides: [CallsCapabilities.Manager],
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./call-manager'),
);
export const CallTransport = Capability.lazyModule(
  'CallTransport',
  {
    requires: [ClientCapabilities.Client],
    provides: [CallsCapabilities.CallTransportProvider],
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./call-transport'),
);
export const ReactRoot = AppCapability.reactRoot(() => import('./react-root'), {
  activatesOn: ClientEvents.Initialized,
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article', 'org.dxos.role.deckCompanion.activeCall', 'org.dxos.role.devtoolsOverview'],
});
