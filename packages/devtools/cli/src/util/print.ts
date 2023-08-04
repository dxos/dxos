//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Space, SpaceMember } from '@dxos/client/echo';
import { Device, Credential } from '@dxos/client/halo';

import { maybeTruncateKey } from './util';

//
// Devices
//

export const mapDevices = (devices: Device[], truncateKeys = false) => {
  return devices.map((device) => ({
    key: maybeTruncateKey(device.deviceKey, truncateKeys),
    kind: device.kind,
  }));
};

export const printDevices = (devices: Device[], flags = {}) => {
  ux.table(
    mapDevices(devices, true),
    {
      key: {
        header: 'key',
      },
      kind: {
        header: 'kind',
      },
    },
    {
      ...flags,
    },
  );
};

//
// Spaces
//

export const mapSpaces = (spaces: Space[], options = { verbose: false, truncateKeys: false }) => {
  return spaces.map((space) => {
    // TODO(burdon): Factor out.
    // TODO(burdon): Agent needs to restart before `ready` is available.
    const { open, ready } = space.internal.data.metrics ?? {};
    const startup = open && ready && new Date(ready).getTime() - new Date(open).getTime();

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
      // TODO(burdon): Negative.
      progress: (
        Math.min(Math.abs((currentDataMutations - startDataMutations) / (totalDataMutations - startDataMutations)), 1) *
        100
      ).toFixed(0),
    };
  });
};

export const printSpaces = (spaces: Space[], flags: any = {}) => {
  ux.table(
    mapSpaces(spaces, { ...flags, truncateKeys: true }),
    {
      key: {
        header: 'key',
      },
      open: {
        header: 'open',
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
      startup: {
        header: 'startup',
        extended: true,
      },
      epoch: {
        header: 'epoch',
      },
      // appliedEpoch: {
      //   header: 'Applied Epoch',
      // },

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

//
// Credentials
//

export const mapCredentials = (credentials: Credential[], truncateKeys = false) => {
  return credentials.map((credential) => ({
    id: maybeTruncateKey(credential.id!, truncateKeys),
    issuer: maybeTruncateKey(credential.issuer!, truncateKeys),
    subject: maybeTruncateKey(credential.subject!.id!, truncateKeys),
    type: credential.subject.assertion['@type'],
  }));
};

export const printCredentials = (credentials: Credential[], flags = {}) => {
  ux.table(
    mapCredentials(credentials, true),
    {
      id: {
        header: 'id',
      },
      issuer: {
        header: 'issuer',
      },
      subject: {
        header: 'subject',
      },
      type: {
        header: 'type',
      },
    },
    {
      ...flags,
    },
  );
};
