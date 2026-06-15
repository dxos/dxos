//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';
import { isTauri } from '@dxos/util';

import { initializeObservability } from './config';
import { LOG_STORE_DB_NAME } from './constants';

const logStore = new IdbLogStore({ dbName: LOG_STORE_DB_NAME });
log.addProcessor(logStore.processor);

runDedicatedWorker({
  onBeforeStart: (cfg) => {
    void initializeObservability(cfg, isTauri(), logStore).catch((err) => log.catch(err));
    return Promise.resolve();
  },
});
