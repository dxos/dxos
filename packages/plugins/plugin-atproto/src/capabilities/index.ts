//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector, ConnectorEvents } from '@dxos/plugin-connector';

import { AtprotoCapabilities, AtprotoEvents } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'), {
  activatesOn: AtprotoEvents.Start,
});
export const AtprotoConnector = Capability.lazyModule(
  'AtprotoConnector',
  { provides: [Connector], activatesOn: ConnectorEvents.Start },
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
    activatesOn: AtprotoEvents.Start,
  },
  () => import('./repo-layer'),
);
