//
// Copyright 2020 DXOS.org
//

import { exec } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

import { FACTORY_OUT_DIR, FACTORY_BOT_DIR, CONFIG } from './config';

const signalUrl = new URL(CONFIG.DX_SIGNAL_ENDPOINT);

const testTeardown = async () => {
  await fs.remove(path.join(process.cwd(), FACTORY_OUT_DIR));
  await fs.remove(path.join(process.cwd(), FACTORY_BOT_DIR));
  await exec(`kill $(ps aux | grep 'bin/signal.js --port ${signalUrl.port}' | awk '{print $2}')`);
};

export default testTeardown;
