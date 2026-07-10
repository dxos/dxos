//
// Copyright 2026 DXOS.org
//

import {
  MemoryWorkerCoordiantor,
  SingleClientCoordinator,
  createCoordinatorOnConnect,
} from '@dxos/worker-framework/coordinator';
export type {
  DedicatedWorkerMessage,
  WorkerCoordinator,
  WorkerCoordinatorMessage,
  WorkerOrPort,
} from '@dxos/worker-framework/coordinator';

export { MemoryWorkerCoordiantor, SingleClientCoordinator, createCoordinatorOnConnect };

export { type RunDedicatedWorkerOptions, runDedicatedWorker } from './dedicated-worker';
export {
  type DedeciatedWorkerClientServicesOptions,
  DedicatedWorkerClientServices,
  LEADER_LOCK_KEY,
  type LeaderTimeoutOptions,
} from './dedicated-worker-client-services';

export { SharedWorkerCoordinator } from './shared-worker-coordinator';
