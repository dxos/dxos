//
// Copyright 2026 DXOS.org
//

import { runDedicatedWorker } from '@dxos/client';
import { log } from '@dxos/log';
import { isTauri } from '@dxos/util';

import { initializeObservability } from './config';

runDedicatedWorker({
  onBeforeStart: async (cfg) => {
    await initializeObservability(cfg, isTauri()).catch((err) => log.catch(err));
  },
});
