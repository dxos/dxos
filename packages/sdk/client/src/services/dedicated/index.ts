//
// Copyright 2026 DXOS.org
//

// NOTE: `./dedicated-worker` (the worker-side runtime — client-services, sqlite, hypercore) is
// deliberately NOT re-exported here: this barrel is statically reachable from the main-thread
// `@dxos/client` root, and the runtime must only load inside the worker (via `@dxos/client/worker`).
export {
  DedicatedWorkerClientServices,
  type DedicatedWorkerClientServicesOptions,
  LEADER_LOCK_KEY,
  type LeaderTimeoutOptions,
} from './dedicated-worker-client-services';
