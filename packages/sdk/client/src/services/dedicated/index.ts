//
// Copyright 2026 DXOS.org
//

import { WorkerProtocol } from '@dxos/worker-framework';

export {
  Memory as MemoryWorkerCoordiantor,
  SingleClient as SingleClientCoordinator,
  createOnConnect as createCoordinatorOnConnect,
} from '@dxos/worker-framework/coordinator';

export type DedicatedWorkerMessage = WorkerProtocol.DedicatedWorkerMessage;
export type WorkerCoordinator = WorkerProtocol.WorkerCoordinator;
export type WorkerCoordinatorMessage = WorkerProtocol.CoordinatorMessage;
export type WorkerOrPort = WorkerProtocol.WorkerOrPort;

export { type RunDedicatedWorkerOptions, runDedicatedWorker } from './dedicated-worker';
export {
  DedicatedWorkerClientServices,
  type DedicatedWorkerClientServicesOptions,
  LEADER_LOCK_KEY,
  type LeaderTimeoutOptions,
} from './dedicated-worker-client-services';

export { SharedWorkerCoordinator } from './shared-worker-coordinator';
