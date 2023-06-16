//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';

import { sleep } from '@dxos/async';
import { getUnixSocket } from '@dxos/client';

const DAEMON_START_TIMEOUT = 5_000;

export const parseAddress = (sock: string) => {
  const [protocol, path] = sock.split('://');
  return { protocol, path };
};

/**
 * Waits till unix socket file is created.
 */
export const waitForDaemon = async (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  await waitFor({
    condition: async () => fs.existsSync(path),
    timeoutError: new Error(`Daemon start timeout exceeded ${DAEMON_START_TIMEOUT}ms`),
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
  const { path } = parseAddress(getUnixSocket(profile));
  return fs.existsSync(path);
};

export const removeSocketFile = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};
