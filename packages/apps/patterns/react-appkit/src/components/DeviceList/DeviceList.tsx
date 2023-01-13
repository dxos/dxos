//
// Copyright 2022 DXOS.org
//

import React, { useMemo } from 'react';

import { PublicKey } from '@dxos/client';

import { Device, DeviceProps } from './Device';

export interface DeviceListProps {
  devices: DeviceProps[];
  currentDevice?: PublicKey;
}

export const DeviceList = ({ devices, currentDevice }: DeviceListProps) => {
  const currentDeviceIndex = useMemo(
    () => currentDevice && devices.findIndex((device) => device.publicKey.equals(currentDevice)),
    [devices, currentDevice]
  );

  return (
    <>
      {devices.map((device, index) => (
        <Device key={device.publicKey.toHex()} {...device} isCurrentDevice={index === currentDeviceIndex} />
      ))}
    </>
  );
};
