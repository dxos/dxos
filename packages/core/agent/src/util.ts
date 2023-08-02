//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { sleep } from '@dxos/async';
import { DX_RUNTIME } from '@dxos/client-protocol';
import { getUnixSocket } from '@dxos/client/services';

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
  const lockFile = path.join(DX_RUNTIME, 'profile', profile, 'lockfile');
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  return lockFile;
};

// TODO(burdon): Push down.
export const waitFor = async ({
  condition,
  increment = 100,
  timeout = 5_000,
  timeoutError,
}: {
  condition: () => Promise<boolean>;
  increment?: number;
  timeout?: number;
  timeoutError?: Error;
}) => {
  let total = 0;
  while (!(await condition())) {
    await sleep(increment);
    total += increment;
    if (total >= timeout) {
      throw timeoutError ?? new Error(`Timeout exceeded (${timeout}ms)`);
    }
  }
};
