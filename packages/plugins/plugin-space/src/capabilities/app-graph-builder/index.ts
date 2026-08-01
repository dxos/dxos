//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { ClientEvents } from '@dxos/plugin-client';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  {
    provides: [AppCapabilities.AppGraphBuilder],
    // Its connectors read `client.spaces` inside atom computations (initialized-only, and a
    // pre-init throw is not re-evaluated when initialization lands).
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./app-graph-builder'),
);
