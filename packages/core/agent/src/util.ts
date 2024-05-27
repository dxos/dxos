//
// Copyright 2023 DXOS.org
//

import fs, { existsSync } from 'node:fs';
import path from 'node:path';

import { Trigger, asyncTimeout, waitForCondition } from '@dxos/async';
import { SystemStatus, fromAgent, getUnixSocket } from '@dxos/client/services';
import { DX_RUNTIME, getProfilePath } from '@dxos/client-protocol';
import { invariant } from '@dxos/invariant';

import { CHECK_INTERVAL, DAEMON_START_TIMEOUT } from './defs';
import { AgentWaitTimeoutError } from './errors';

export const parseAddress = (sock: string) => {
  const [protocol, path] = sock.split('://');
  return { protocol, path };
};

export const removeSocketFile = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};

export const removeLockFile = (profile: string) => {
  const lockFile = lockFilePath(profile);
  fs.rmSync(lockFile, { force: true });
};

export const lockFilePath = (profile: string): string => {
  const lockFile = getProfilePath(DX_RUNTIME, profile, 'lockfile');
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  return lockFile;
};

export const waitForAgentToStart = async (profile: string, timeout?: number) => {
  // Wait for socket file to appear.
  {
    await waitForCondition({
      condition: () => existsSync(parseAddress(getUnixSocket(profile)).path),
      timeout: timeout ?? DAEMON_START_TIMEOUT,
      interval: CHECK_INTERVAL,
      error: new AgentWaitTimeoutError(),
    });
  }

  // Check if agent is initialized.
  {
    const services = fromAgent({ profile });
    await services.open();

    const trigger = new Trigger();
    const stream = services.services.SystemService!.queryStatus({});
    stream.subscribe(({ status }) => {
      invariant(status === SystemStatus.ACTIVE);
      trigger.wake();
    });
    await asyncTimeout(trigger.wait(), DAEMON_START_TIMEOUT, new AgentWaitTimeoutError());

    await stream.close();
    await services.close();
  }
};
