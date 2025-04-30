//
// Copyright 2022 DXOS.org
//

// import { type Table } from '@oclif/core/lib/cli-ux';

import { ux } from '@oclif/core';

import { asyncTimeout } from '@dxos/async';
import { type Space, SpaceMember, SpaceState } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';

import { maybeTruncateKey } from './keys';
import { table, type TableOptions } from './table';
import { SPACE_WAIT_TIMEOUT } from '../defaults';
import { SpaceTimeoutError } from '../errors';

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
    await asyncTimeout(space.waitUntilReady(), timeout, new SpaceTimeoutError(timeout));
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
    const epoch = pipeline?.currentEpoch?.subject.assertion.number;

    return {
      id: space.id,
      state: SpaceState[space.state.get()],
      name: space.state.get() === SpaceState.SPACE_READY ? space.properties.name : 'loading...',

      members: space.members.get().length,
      objects: space.db.coreDatabase.getAllObjectIds().length,

      key: maybeTruncateKey(space.key, options.truncateKeys),
      epoch,
      startup,
      automergeRoot: space.internal.data.pipeline?.spaceRootUrl,
      // appliedEpoch,
    };
  });
};

export const printSpaces = (spaces: Space[], flags: MapSpacesOptions & TableOptions = {}) => {
  ux.stdout(
    table(
      mapSpaces(spaces, { ...flags, truncateKeys: true }),
      {
        id: {
          header: 'id',
          width: 8,
        },
        state: {
          header: 'state',
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

        key: {
          header: 'key',
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
        automergeRoot: {
          header: 'automerge root doc',
          extended: true,
        },
      },
      flags,
    ),
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
  ux.stdout(
    table(
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
      flags,
    ),
  );
};
