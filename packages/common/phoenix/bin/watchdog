#!/usr/bin/env -S node

import { log } from '@dxos/log';
import { WatchDog } from '../dist/lib/node-esm/index.mjs';

const params = JSON.parse(process.argv[2]);

const watchdog = new WatchDog(params);
watchdog.start().then(
  () => {
    log(`Watchdog started`);
  },
  (err) => {
    log.catch(err);
  },
);

process.on('SIGINT', async () => {
  await watchdog.stop();
  process.exit(0);
});
