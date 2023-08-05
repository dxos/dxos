//
// Copyright 2023 DXOS.org
//

import fs from 'node:fs';
import path from 'node:path';

import { DX_RUNTIME } from '@dxos/client-protocol';
import { getUnixSocket } from '@dxos/client/services';

export const parseAddress = (sock: string) => {
  const [protocol, path] = sock.split('://');
  return { protocol, path };
};

export const removeSocketFile = (profile: string) => {
  const { path } = parseAddress(getUnixSocket(profile));
  fs.rmSync(path, { force: true });
};

export const lockFilePath = (profile: string): string => {
  const lockFile = path.join(DX_RUNTIME, 'profile', profile, 'lockfile');
  fs.mkdirSync(path.dirname(lockFile), { recursive: true });
  return lockFile;
};
