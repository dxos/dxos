//
// Copyright 2026 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Connector } from '@dxos/plugin-connector';

import { AtprotoCapabilities } from '#types';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder'));
export const AtprotoConnector = Capability.lazyModule(
  'AtprotoConnector',
  { provides: [Connector] },
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
  },
  () => import('./repo-layer'),
);
