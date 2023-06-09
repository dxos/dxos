//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { DX_RUNTIME } from '@dxos/client-protocol';

const START_TIMEOUT = 5_000;

export const getUnixSocket = (profile: string, protocol = 'unix') => `${protocol}://${DX_RUNTIME}/daemon/${profile}.sock`;

export const addrFromSocket = (sock: string) => sock.slice('unix://'.length);

/**
 * Waits till unix socket file is created.
 */
export const waitForDaemon = async (profile: string) => {
  let slept = 0;
  const inc = 100;
  const sockAddr = addrFromSocket(getUnixSocket(profile));

  while (!fs.existsSync(sockAddr)) {
    await sleep(inc);
    slept += inc;
    if (slept >= START_TIMEOUT) {
      throw new Error(`Daemon start timeout exceeded ${START_TIMEOUT}[ms]`);
    }
  }
};

export const removeSocketFile = (profile: string) => {
  const socketAddr = addrFromSocket(getUnixSocket(profile));
  fs.rmSync(socketAddr, { force: true });
};
