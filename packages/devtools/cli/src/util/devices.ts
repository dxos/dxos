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
    label: device.profile?.displayName,
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
      label: {
        header: 'label',
      },
    },
    {
      ...flags,
    },
  );
};
