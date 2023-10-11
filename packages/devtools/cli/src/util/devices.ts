//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Device } from '@dxos/client/halo';

import { maybeTruncateKey } from './types';

export const mapDevices = (devices: Device[], truncateKeys = false) => {
  return devices.map((device) => ({
    key: maybeTruncateKey(device.deviceKey, truncateKeys),
    kind: device.kind,
    platform: device.profile?.platform,
    platformVersion: device.profile?.platformVersion,
    architecture: device.profile?.architecture,
    os: device.profile?.os,
    osVersion: device.profile?.osVersion,
  }));
};

export const printDevices = (devices: Device[], flags = {}) => {
  ux.table(
    mapDevices(devices, true),
    {
      key: { header: 'key' },
      kind: { header: 'kind' },
      platform: { header: 'platform' },
      platformVersion: { header: 'platformVersion' },
      architecture: { header: 'architecture' },
      os: { header: 'os' },
      osVersion: { header: 'osVersion' },
    },
    {
      ...flags,
    },
  );
};
