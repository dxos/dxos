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

type SpaceInfo = {
  key: string;
  name: string;
  epochStashedMutations: number;
  lastEpoch: number;
  appliedEpoch: number;
  currentDataMutations: number;
  totalDataMutations: number;
  progress: string;
};

export const mapSpaces = (spaces: Space[], truncateKeys = false): SpaceInfo[] => {
  return spaces.map((space) => {
    const pipeline = space.internal.data.pipeline;
    const startDataMutations = pipeline?.currentEpoch?.subject.assertion.timeframe.totalMessages() ?? 0;
    const lastEpoch = pipeline?.currentEpoch?.subject.assertion.number;
    const appliedEpoch = pipeline?.appliedEpoch?.subject.assertion.number;
    const currentDataMutations = pipeline?.currentDataTimeframe?.totalMessages() ?? 0;
    const totalDataMutations = pipeline?.targetDataTimeframe?.totalMessages() ?? 0;

    return {
      key: maybeTruncateKey(space.key, truncateKeys),
      name: space.properties.name,
      epochStashedMutations: startDataMutations,
      lastEpoch,
      appliedEpoch,
      currentDataMutations,
      totalDataMutations,
      progress: (
        Math.min(Math.abs((currentDataMutations - startDataMutations) / (totalDataMutations - startDataMutations)), 1) *
        100
      ).toFixed(0),
    };
  });
};

export const printSpaces = (spaces: Space[], flags = {}) => {
  ux.table(
    mapSpaces(spaces, true),
    {
      key: {
        header: 'key',
      },
      name: {
        header: 'name',
      },
      totalDataMutations: {
        header: 'Total data mutations',
      },
      currentDataMutations: {
        header: 'Processed data mutations',
      },
      epochStashedMutations: {
        header: 'Stashed by Epoch',
      },
      lastEpoch: {
        header: 'Last Epoch',
      },
      appliedEpoch: {
        header: 'Applied Epoch',
      },
      progress: {
        header: 'Progress',
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
