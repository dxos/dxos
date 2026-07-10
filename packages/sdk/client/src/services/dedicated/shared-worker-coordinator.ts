//
// Copyright 2026 DXOS.org
//

import { SharedWorkerCoordinator as BaseSharedWorkerCoordinator } from '@dxos/worker-framework/coordinator';

const defaultCreateWorker = () =>
  new SharedWorker(new URL('#coordinator-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-coordinator-worker',
  });

export class SharedWorkerCoordinator extends BaseSharedWorkerCoordinator {
  constructor(createWorker: () => SharedWorker = defaultCreateWorker) {
    super({ createWorker });
  }
}
