//
// Copyright 2022 DXOS.org
//

import compare from 'compare-semver';
import NPM from 'npm-api';
import * as process from 'process';

// TODO(burdon): Util to clear screen.
export const clear = () => {
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
};

// TODO(burdon): Command to auto-update.
export const versionCheck = async (name: string, version: string): Promise<string | undefined> => {
  const npm = new NPM();
  const repo = await npm.repo(name).package();
  const max = version !== compare.max([repo.version, version]);
  return max ? repo.version : undefined;
};
