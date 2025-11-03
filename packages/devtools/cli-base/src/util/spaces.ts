//
// Copyright 2022 DXOS.org
//

import { ux } from '@oclif/core';

import { asyncTimeout } from '@dxos/async';
import { type Space, SpaceMember, SpaceState, type SpaceSyncState } from '@dxos/client/echo';
import { truncateKey } from '@dxos/debug';

import { SPACE_WAIT_TIMEOUT } from '../defaults';
import { SpaceTimeoutError } from '../errors';

import { maybeTruncateKey } from './keys';
import { type TableOptions, table } from './table';

// Use a direct dynamic import to avoid implied eval via Function constructor.
const asyncImport = (module: string) => import(module);

export const selectSpace = async (spaces: Space[]) => {
  const inquirer = (await asyncImport('inquirer')).default;
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

export const mapSpaces = async (spaces: Space[], options: MapSpacesOptions = { verbose: false, truncateKeys: false }) =>
  await Promise.all(
    spaces.map(async (space) => {
      // TODO(burdon): Factor out.
      // TODO(burdon): Agent needs to restart before `ready` is available.
      const { open, ready } = space.internal.data.metrics ?? {};
      const startup = open && ready && ready.getTime() - open.getTime();

      // TODO(burdon): Get feeds from client-services if verbose (factor out from devtools/diagnostics).
      // const host = client.services.services.DevtoolsHost!;
      const pipeline = space.internal.data.pipeline;
      const epoch = pipeline?.currentEpoch?.subject.assertion.number;

      const syncState = aggregateSyncState(await space.db.coreDatabase.getSyncState());

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
        syncState: `${syncState.count} ${getSyncIndicator(syncState.up, syncState.down)} (${syncState.peers} peers)`,
      };
    }),
  );

export const printSpaces = async (spaces: Space[], flags: MapSpacesOptions & TableOptions = {}) => {
  ux.stdout(
    table(
      await mapSpaces(spaces, { ...flags, truncateKeys: true }),
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
        syncState: {
          header: 'sync',
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
export const mapMembers = (members: SpaceMember[], truncateKeys = false) =>
  members.map((member) => ({
    key: maybeTruncateKey(member.identity.identityKey, truncateKeys),
    name: member.identity.profile?.displayName,
    presence: member.presence === SpaceMember.PresenceState.ONLINE ? 'Online' : 'Offline',
  }));

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

//
// Sync
//

const aggregateSyncState = (syncState: SpaceSyncState) => {
  const peers = Object.keys(syncState.peers ?? {}).length;
  const missingOnLocal = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnLocal), 0);
  const missingOnRemote = Math.max(...Object.values(syncState.peers ?? {}).map((peer) => peer.missingOnRemote), 0);
  const differentDocuments = Math.max(
    ...Object.values(syncState.peers ?? {}).map((peer) => peer.differentDocuments),
    0,
  );

  return {
    count: missingOnLocal + missingOnRemote + differentDocuments,
    peers,
    up: missingOnRemote > 0 || differentDocuments > 0,
    down: missingOnLocal > 0 || differentDocuments > 0,
  };
};

const getSyncIndicator = (up: boolean, down: boolean) => {
  if (up) {
    if (down) {
      return '⇅';
    } else {
      return '↑';
    }
  } else {
    if (down) {
      return '↓';
    } else {
      return '✓';
    }
  }
};
