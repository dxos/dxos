//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';

export const AppGraphBuilder = Capability.lazyModule(
  'AppGraphBuilder',
  {
    // Browser-only: the builder defaults its share-link origin to `window.location.origin`, read
    // when the module activates.
    environments: [],
    provides: [AppCapabilities.AppGraphBuilder],
    // Its connectors read `client.spaces` inside atom computations (initialized-only, and a
    // pre-init throw is not re-evaluated when initialization lands).
    activatesOn: ClientEvents.Initialized,
  },
  () => import('./app-graph-builder'),
);
