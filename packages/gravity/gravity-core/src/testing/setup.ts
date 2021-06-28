//
// Copyright 2020 DXOS.org
//

import { spawn, exec } from 'child_process';
import debug from 'debug';
import fs from 'fs-extra';
import { before } from 'mocha';
import path from 'path';

import { FACTORY_OUT_DIR, FACTORY_BOT_DIR, OVERRIDE_CONFIG } from '../config';

const log = debug('dxos:gravity:testing:setup');

const LOCAL = 'localhost';

const signalUrl = new URL(OVERRIDE_CONFIG.DX_SIGNAL_ENDPOINT);

before(async () => {
  log('setup');
  if (signalUrl.hostname === LOCAL) {
    spawn('npx', ['signal', '--port', signalUrl.port.toString()]);
  }
});

after(async () => {
  log('teardown');
  await fs.remove(path.join(process.cwd(), FACTORY_OUT_DIR));
  await fs.remove(path.join(process.cwd(), FACTORY_BOT_DIR));
  await exec(`kill $(ps aux | grep 'bin/signal.js --port ${signalUrl.port}' | awk '{print $2}')`);
});
