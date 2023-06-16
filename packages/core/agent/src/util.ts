//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { DX_RUNTIME } from '@dxos/client-protocol';

const DAEMON_START_TIMEOUT = 5_000;

export const getUnixSocket = (profile: string, protocol = 'unix') =>
  `${protocol}://${DX_RUNTIME}/agent/${profile}.sock`;

export const addrFromSocket = (sock: string) => sock.slice('unix://'.length);

/**
 * Waits till unix socket file is created.
 */
export const waitForDaemon = async (profile: string) => {
  const sockAddr = addrFromSocket(getUnixSocket(profile));

  await waitFor({
    condition: async () => fs.existsSync(sockAddr),
    timeoutError: new Error(`Daemon start timeout exceeded ${DAEMON_START_TIMEOUT}[ms]`),
    timeout: DAEMON_START_TIMEOUT,
  });
};

export const waitFor = async ({
  condition,
  timeoutError,
  timeout = 5_000,
}: {
  condition: () => Promise<boolean>;
  timeoutError?: Error;
  timeout?: number;
}) => {
  let slept = 0;
  const inc = 100;

  while (!(await condition())) {
    await sleep(inc);
    slept += inc;
    if (slept >= timeout) {
      throw timeoutError ?? new Error(`Timeout exceeded ${timeout}ms`);
    }
  }
};

export const socketFileExists = (profile: string) => {
  const socketAddr = addrFromSocket(getUnixSocket(profile));
  return fs.existsSync(socketAddr);
};

export const removeSocketFile = (profile: string) => {
  const socketAddr = addrFromSocket(getUnixSocket(profile));
  fs.rmSync(socketAddr, { force: true });
};
