//
// Copyright 2020 DXOS.org
//

import { spawn } from 'child_process';

import { OVERRIDE_CONFIG } from './config';

const LOCAL = 'localhost';

const signalUrl = new URL(OVERRIDE_CONFIG.DX_SIGNAL_ENDPOINT);

const testSetup = async () => {
  if (signalUrl.hostname === LOCAL) {
    spawn('npx', ['signal', '--port', signalUrl.port.toString()]);
  }
};

// DOWNLOAD CONFIG PROFILE into conf temp file

export default testSetup;
