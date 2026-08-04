//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import * as AtprotoCapabilities from '../types/AtprotoCapabilities';
import * as AtprotoEvents from '../types/AtprotoEvents';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const AtprotoConnector = Capability.lazyModule(
  'AtprotoConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
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
