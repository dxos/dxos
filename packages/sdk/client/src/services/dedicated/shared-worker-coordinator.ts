//
// Copyright 2026 DXOS.org
//

import { log } from '@dxos/log';
import { SharedWorkerCoordinator as BaseSharedWorkerCoordinator } from '@dxos/worker-framework/coordinator';

const defaultCreateWorker = () =>
  new SharedWorker(new URL('#coordinator-worker', import.meta.url), {
    type: 'module',
    name: 'dxos-coordinator-worker',
  });

// TODO(dmaretskyi): remove this.
export class SharedWorkerCoordinator extends BaseSharedWorkerCoordinator {
  constructor(createWorker: () => SharedWorker = defaultCreateWorker) {
    super({ createWorker });
    // #region DEBUG
    log.info('[DEBUG] SharedWorkerCoordinator ctor', { usingDefaultEntrypoint: createWorker === defaultCreateWorker });
    // #endregion DEBUG
  }
}
