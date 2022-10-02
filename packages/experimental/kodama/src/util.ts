//
// Copyright 2022 DXOS.org
//

import compare from 'compare-semver';
import NPM from 'npm-api';
import * as process from 'process';

/**
 * Clear terminal.
 */
export const clear = () => {
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
};

/**
 * Check version against NPM.
 */
export const versionCheck = async (name: string, version: string): Promise<string | undefined> => {
  const npm = new NPM();
  const repo = await npm.repo(name).package();
  const max = version !== compare.max([repo.version, version]);
  return max ? repo.version : undefined;
};

/**
 * Copy to clipboard.
 */
export const copyToClipboard = async (text: string) => {
  try {
    // eslint-disable-next-line no-eval
    const clipboard = (await eval('import("clipboardy")')).default;
    await clipboard.write(text);
    return true;
  } catch (err) {
    return false;
  }
};
