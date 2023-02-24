//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Device as DeviceType, DeviceKind } from '@dxos/protocols/proto/dxos/client/services';

import { Device } from './Device';

export interface DeviceListProps {
  devices: DeviceType[];
}

export const DeviceList = ({ devices }: DeviceListProps) => {
  return (
    <>
      {devices.map((device, index) => (
        <Device
          key={device.deviceKey.toHex()}
          publicKey={device.deviceKey}
          isCurrentDevice={device.kind === DeviceKind.CURRENT}
        />
      ))}
    </>
  );
};
