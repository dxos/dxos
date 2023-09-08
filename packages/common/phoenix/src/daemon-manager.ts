//
// Copyright 2023 DXOS.org
//

import { fork } from 'node:child_process';
import { dirname, join } from 'node:path';
import pkgUp from 'pkg-up';

import { WatchDogParams } from './watchdog';

const WATCHDOG_PATH = join(dirname(pkgUp.sync({ cwd: __dirname })!), 'bin', 'watchdog');

export class DaemonManager {
  start(params: WatchDogParams) {
    const watchDog = fork(WATCHDOG_PATH, [JSON.stringify(params)], {
      stdio: ['ipc'],
      detached: true,
      cwd: __dirname,
    });

    watchDog.on('exit', (code) => {
      console.error('Monitor died unexpectedly with exit code %d', code);
    });
    watchDog.send(JSON.stringify({ message: 'hello' }));

    watchDog.disconnect();
    watchDog.unref();
  }
}
