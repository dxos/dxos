//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';
import { Table } from '@oclif/core/lib/cli-ux';

import { Space, SpaceMember } from '@dxos/client/echo';

import { MapSpacesOptions, mapSpaces, maybeTruncateKey } from '../../util';

//
// Spaces
//

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
