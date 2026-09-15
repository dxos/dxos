//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client/worker';
import { resolveTelemetryTag } from '@dxos/config';
import { log } from '@dxos/log';
import { IdbLogStore } from '@dxos/log-store-idb';

import { LOG_STORE_DB_NAME } from './constants.ts';

runDedicatedWorker({
  onBeforeStart: async (config) => {
    if (resolveTelemetryTag(config) === 'e2e') {
      log.addProcessor(new IdbLogStore({ dbName: LOG_STORE_DB_NAME }).processor);
    }
  },
});
