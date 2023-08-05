//
// Copyright 2022 DXOS.org
//

import { asyncTimeout } from '@dxos/async';
import { Space } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';

import { SpaceWaitTimeoutError } from '../errors';
import { SPACE_WAIT_TIMEOUT } from '../timeouts';
import { maybeTruncateKey } from './types';

export type MapSpacesOptions = {
  verbose?: boolean;
  truncateKeys?: boolean;
};

export const mapSpaces = (spaces: Space[], options: MapSpacesOptions = { verbose: false, truncateKeys: false }) => {
  return spaces.map((space) => {
    // TODO(burdon): Factor out.
    // TODO(burdon): Agent needs to restart before `ready` is available.
    const { open, ready } = space.internal.data.metrics ?? {};
    const startup = open && ready && ready.getTime() - open.getTime();

    // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
    // const host = client.services.services.DevtoolsHost!;
    const pipeline = space.internal.data.pipeline;
    const startDataMutations = pipeline?.currentEpoch?.subject.assertion.timeframe.totalMessages() ?? 0;
    const epoch = pipeline?.currentEpoch?.subject.assertion.number;
    // const appliedEpoch = pipeline?.appliedEpoch?.subject.assertion.number;
    const currentDataMutations = pipeline?.currentDataTimeframe?.totalMessages() ?? 0;
    const totalDataMutations = pipeline?.targetDataTimeframe?.totalMessages() ?? 0;

    return {
      key: maybeTruncateKey(space.key, options.truncateKeys),
      open: space.isOpen,
      name: space.properties.name,
      members: space.members.get().length,
      objects: space.db.query().objects.length,
      startup,
      epoch,
      // appliedEpoch,

      startDataMutations,
      currentDataMutations,
      totalDataMutations, // TODO(burdon): Shows up lower than current.

      // TODO(burdon): Negative?
      progress: (
        Math.min(Math.abs((currentDataMutations - startDataMutations) / (totalDataMutations - startDataMutations)), 1) *
        100
      ).toFixed(0),
    };
  });
};

export const selectSpace = async (spaces: Space[]) => {
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([
    {
      name: 'key',
      type: 'list',
      message: 'Select a space:',
      choices: spaces.map((space) => ({
        name: `[${truncateKey(space.key)}] ${space.properties.name ?? ''}`,
        value: space.key,
      })),
    },
  ]);

  return key;
};

export const waitForSpace = async (
  space: Space,
  timeout = SPACE_WAIT_TIMEOUT,
  exceptionHandler?: (err: Error) => void,
) => {
  try {
    await asyncTimeout(space.waitUntilReady(), timeout, new SpaceWaitTimeoutError(timeout));
  } catch (err: any) {
    if (exceptionHandler) {
      exceptionHandler(err);
    } else {
      throw err;
    }
  }
};
