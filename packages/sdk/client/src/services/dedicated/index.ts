//
// Copyright 2026 DXOS.org
//

import { Messages } from '@dxos/worker-framework';

export {
  Memory as MemoryWorkerCoordiantor,
  SingleClient as SingleClientCoordinator,
  createOnConnect as createCoordinatorOnConnect,
} from '@dxos/worker-framework/coordinator';

export type DedicatedWorkerMessage = Messages.DedicatedWorkerMessage;
export type WorkerCoordinator = Messages.WorkerCoordinator;
export type WorkerCoordinatorMessage = Messages.CoordinatorMessage;
export type WorkerOrPort = Messages.WorkerOrPort;

export { type RunDedicatedWorkerOptions, runDedicatedWorker } from './dedicated-worker';
export {
  DedicatedWorkerClientServices,
  type DedicatedWorkerClientServicesOptions,
  LEADER_LOCK_KEY,
  type LeaderTimeoutOptions,
} from './dedicated-worker-client-services';

export { SharedWorkerCoordinator } from './shared-worker-coordinator';
