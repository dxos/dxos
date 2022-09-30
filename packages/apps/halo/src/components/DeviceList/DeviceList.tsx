//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Device } from './Device';

export interface DeviceListProps {
  devices: any[]
}

export const DeviceList = ({ devices }: DeviceListProps) => {
  return (
    <>
      {devices.map(device => (
        <Device key={device.publicKey} device={device} />
      ))}
    </>
  );
};
