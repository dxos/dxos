//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';
import { type Table } from '@oclif/core/lib/cli-ux';

import { asyncTimeout } from '@dxos/async';
import { type Space, SpaceMember } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';

import { maybeTruncateKey } from './types';
import { SpaceWaitTimeoutError } from '../errors';
import { SPACE_WAIT_TIMEOUT } from '../timeouts';

export const selectSpace = async (spaces: Space[]) => {
  // eslint-disable-next-line no-eval
  const inquirer = (await eval('import("inquirer")')).default;
  const { key } = await inquirer.prompt([
    {
      name: 'key',
      type: 'list',
      message: 'Select a space:',
      choices: await Promise.all(
        spaces.map(async (space) => {
          await waitForSpace(space);
          return {
            name: `[${truncateKey(space.key)}] ${space.properties.name ?? ''}`,
            value: space.key,
          };
        }),
      ),
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
      objects: space.db.automerge.getAllObjectIds().length,
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

export const printSpaces = (spaces: Space[], flags: MapSpacesOptions & Table.table.Options = {}) => {
  ux.table(
    mapSpaces(spaces, { ...flags, truncateKeys: true }),
    {
      key: {
        header: 'key',
      },
      open: {
        header: 'open',
        minWidth: 6,
      },
      name: {
        header: 'name',
      },
      members: {
        header: 'members',
      },
      objects: {
        header: 'objects',
      },
      epoch: {
        header: 'epoch',
      },
      // appliedEpoch: {
      //   header: 'Applied Epoch',
      // },

      startup: {
        header: 'startup',
        extended: true,
      },
      startDataMutations: {
        header: 'stashed', // TODO(burdon): Stashed?
        extended: true,
      },
      currentDataMutations: {
        header: 'processed',
        extended: true,
      },
      totalDataMutations: {
        header: 'total',
        extended: true,
      },
      progress: {
        header: 'progress',
        extended: true,
        // TODO(burdon): Use `ink` to render progress bar (separate from list commands).
        // get: (spaceInfo) => {
        //   let progressValue = +spaceInfo.progress;
        //   const subscription = spaces[0].pipeline.subscribe({
        //     next: (value) => {
        //       console.log('update', value);
        //       progressValue += 1;
        //     },
        //   });
        //   return progressValue;
        // },
      },
    },
    {
      ...flags,
    },
  );
};

//
// Members
//

// TODO(burdon): Export proto type.
export const mapMembers = (members: SpaceMember[], truncateKeys = false) => {
  return members.map((member) => ({
    key: maybeTruncateKey(member.identity.identityKey, truncateKeys),
    name: member.identity.profile?.displayName,
    presence: member.presence === SpaceMember.PresenceState.ONLINE ? 'Online' : 'Offline',
  }));
};

export const printMembers = (members: SpaceMember[], flags = {}) => {
  ux.table(
    mapMembers(members, true),
    {
      key: {
        header: 'identity key',
      },
      name: {
        header: 'display name',
      },
      presence: {
        header: 'presence',
      },
    },
    {
      ...flags,
    },
  );
};
