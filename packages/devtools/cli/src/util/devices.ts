//
// Copyright 2023 DXOS.org
//

import { ux } from '@oclif/core';

import { Device, DeviceKind, DeviceType } from '@dxos/client/halo';

import { maybeTruncateKey } from './types';

export const mapDevices = (devices: Device[], truncateKeys = false) => {
  return devices.map((device) => ({
    label: device.profile?.label,
    type: device.profile?.type ? DeviceType[device.profile?.type] : 'UNKNOWN',
    key: maybeTruncateKey(device.deviceKey, truncateKeys),
    kind: DeviceKind[device.kind],
    platform: device.profile?.platform,
    platformVersion: device.profile?.platformVersion,
    architecture: device.profile?.architecture,
    os: device.profile?.os,
    osVersion: device.profile?.osVersion,
    presence: device?.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence],
  }));
};

export const printDevices = (devices: Device[], flags = {}) => {
  ux.table(
    mapDevices(devices, true),
    {
      key: { header: 'key' },
      label: { header: 'label' },
      presence: { header: 'presence' },
      type: { header: 'type' },
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
