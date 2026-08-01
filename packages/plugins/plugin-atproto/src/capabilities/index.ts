//
// Copyright 2026 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector } from '@dxos/plugin-connector';

import { AtprotoCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: ActivationEvents.DeferredStartup,
});
export const AtprotoConnector = Capability.lazyModule(
  'AtprotoConnector',
  { provides: [Connector], activatesOn: ActivationEvents.DeferredStartup },
  () => import('./connector'),
);
export const ReactSurface = AppCapability.surface(() => import('./react-surface'), {
  roles: ['org.dxos.role.article'],
});
export const RepoLayer = Capability.lazyModule(
  'RepoLayer',
  {
    requires: [ClientCapabilities.Client],
    provides: [AtprotoCapabilities.RepoLayer, AtprotoCapabilities.ReadRepoLayer],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./repo-layer'),
);
