//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { Space } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';
import { PublicKey } from '@dxos/keys';

import { SPACE_WAIT_TIMEOUT, spaceWaitError } from '../timeouts';

export const maybeTruncateKey = (key: PublicKey, truncate = false) => (truncate ? truncateKey(key) : key.toHex());

export const safeParseInt = (value: string | undefined, defaultValue?: number): number | undefined => {
  try {
    const n = parseInt(value ?? '');
    return isNaN(n) ? defaultValue : n;
  } catch (err) {
    return defaultValue;
  }
};

//
// Spaces
//

export const selectSpace = async (spaces: Space[]) => {
  await Promise.all(spaces.map((space) => asyncTimeout(space.waitUntilReady(), SPACE_WAIT_TIMEOUT, spaceWaitError())));
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([
    {
      name: 'key',
      type: 'list',
      message: 'Select a space:',
      choices: spaces.map((space) => ({
        name: `[${truncateKey(space.key)}] ${space.properties.name}`,
        value: space.key,
      })),
    },
  ]);

  return key;
};
