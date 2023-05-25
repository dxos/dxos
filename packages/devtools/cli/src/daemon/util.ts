//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';

const START_TIMEOUT = 5_000;

export const getUnixSocket = (profile: string) => `unix://${process.env.HOME}/.dx/run/${profile}.sock`;

export const addrFromSocket = (sock: string) => sock.slice('unix://'.length);

export const waitForDaemon = async (profile: string) => {
  //
  // Wait for daemon to start.
  //
  let slept = 0;
  const inc = 100;
  const sockAddr = getUnixSocket(profile).slice('unix://'.length);

  while (!fs.existsSync(sockAddr)) {
    await sleep(inc);
    slept += inc;

    if (slept >= START_TIMEOUT) {
      throw new Error(`Daemon start timeout exceeded ${START_TIMEOUT}[ms]`);
    }
  }
};
