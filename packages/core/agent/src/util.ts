//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { getUnixSocket } from '@dxos/client';

const START_TIMEOUT = 5_000;

export const parseAddress = (sock: string) => {
  const [protocol, path] = sock.split('://');
  return { protocol, path };
};

/**
 * Waits till unix socket file is created.
 */
export const waitForDaemon = async (profile: string) => {
  let slept = 0;
  const inc = 100;

  const { path } = parseAddress(getUnixSocket(profile));
  while (!fs.existsSync(path)) {
    await sleep(inc);
    slept += inc;
    if (slept >= START_TIMEOUT) {
      throw new Error(`Daemon start timeout exceeded ${START_TIMEOUT}[ms]`);
    }
  }
};

export const removeSocketFile = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};
