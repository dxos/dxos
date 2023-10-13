//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { type Device as DeviceType, DeviceKind } from '@dxos/react-client/halo';

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
