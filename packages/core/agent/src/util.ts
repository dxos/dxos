//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { DX_RUNTIME, getUnixSocket } from '@dxos/client';

export const parseAddress = (sock: string) => {
  const [protocol, path] = sock.split('://');
  return { protocol, path };
};

export const socketFileExists = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  return fs.existsSync(path);
};

export const removeSocketFile = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};

/**
 * Waits till unix socket file is created.
 */
export const waitForDaemon = async (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};

export const lockFilePath = (profile: string): string => {
  const lockFile = path.join(DX_RUNTIME, 'agent', 'profile', profile, 'lockfile');
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  return lockFile;
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
