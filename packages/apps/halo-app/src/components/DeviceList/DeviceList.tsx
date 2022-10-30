//
// Copyright 2022 DXOS.org
//

import React from 'react';

import { Device, DeviceProps } from './Device';

export interface DeviceListProps {
  items: DeviceProps[]
}

export const DeviceList = ({ items }: DeviceListProps) => {
  return (
    <>
      {items.map((item) => (
        <Device key={item.publicKey.toHex()} {...item} />
      ))}
    </>
  );
};
