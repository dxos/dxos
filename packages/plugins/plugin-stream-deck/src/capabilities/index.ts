//
// Copyright 2026 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as SpaceCapabilities from '@dxos/plugin-space/SpaceCapabilities';

import { StreamDeckCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));

export const BridgeDriver = Capability.lazyModule(
  'BridgeDriver',
  {
    environments: [],
    requires: [Capabilities.AtomRegistry, Capabilities.OperationInvoker, SpaceCapabilities.Dashboard],
    provides: [StreamDeckCapabilities.BridgeStatus],
    activatesOn: ClientEvents.SpacesReady,
  },
  () => import('./bridge-driver'),
);

export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.deckCompanion.streamDeck', 'org.dxos.role.statusIndicator'],
});
