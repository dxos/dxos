//
// Copyright 2026 DXOS.org
//

import { type QueryExecutorMode } from '@dxos/echo-host';
import { type Runtime_Client_EdgeFeatures } from '@dxos/protocols/buf/dxos/config_pb';

import { type DataSpaceManagerRuntimeProps } from './spaces/index.ts';

//
// The echo subsystem's options. Stating them here rather than taking the stack's whole bag is what
// keeps the subsystem from depending on the host that composes it. The tags and interfaces this
// subsystem promises live in `contracts/spaces.ts`.
//

export type Options = DataSpaceManagerRuntimeProps & {
  /** Disables the p2p (mesh) replication path, taking its replicator and its requirement with it. */
  disableP2pReplication?: boolean;
  edgeFeatures?: Runtime_Client_EdgeFeatures;
  /** Query evaluation path for every host query; see `QueryExecutorMode`. */
  queryExecutor?: QueryExecutorMode;
  /**
   * Whether subduction replication can actually be built. The feature flag is set in config
   * profiles that configure no edge endpoint, and requiring a tag nothing provides would prune the
   * specs that declare it — silently taking the data space manager, and every service built on it,
   * with them. So the host resolves flag-and-endpoint into this one answer.
   */
  subductionEnabled?: boolean;
};
