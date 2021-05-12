//
// Copyright 2020 DXOS.org
//

import { spawn } from 'child_process';

import { CONFIG } from './config';

const LOCAL = 'localhost';

const signalUrl = new URL(CONFIG.DX_SIGNAL_ENDPOINT);

const testSetup = async () => {
  if (signalUrl.hostname === LOCAL) {
    spawn('npx', ['signal', '--port', signalUrl.port.toString()]);
  }
};

export default testSetup;
