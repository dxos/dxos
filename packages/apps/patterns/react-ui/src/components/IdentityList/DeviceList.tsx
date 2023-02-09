//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { DeviceInfo } from '@dxos/protocols/proto/dxos/halo/credentials/identity';

import { IdentityListItem } from './IdentityListItem';

export interface DeviceListProps {
  devices: DeviceInfo[];
  onSelect?: (device: DeviceInfo) => void;
}

export const DeviceList = ({ devices, onSelect }: DeviceListProps) => {
  return (
    <ul className='flex flex-col gap-2'>
      {devices.map((device) => {
        const identity = { identityKey: device.publicKey, displayName: device.displayName };
        return (
          <IdentityListItem
            key={device.publicKey.toHex()}
            identity={identity}
            onClick={onSelect && (() => onSelect(device))}
          />
        );
      })}
    </ul>
  );
};
