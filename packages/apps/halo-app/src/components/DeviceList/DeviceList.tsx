//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Device, DeviceProps } from './Device';

export interface DeviceListProps {
  devices: DeviceProps[];
}

export const DeviceList = ({ devices }: DeviceListProps) => {
  return (
    <>
      {devices.map((device) => (
        <Device key={device.publicKey.toHex()} {...device} />
      ))}
    </>
  );
};
