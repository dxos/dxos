//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Device } from '@dxos/protocols/proto/dxos/client/services';

import { IdentityListItem } from './IdentityListItem';

export interface DeviceListProps {
  devices: Device[];
  onSelect?: (device: Device) => void;
}

export const DeviceList = ({ devices, onSelect }: DeviceListProps) => {
  return (
    <ul className='flex flex-col gap-2'>
      {devices.map((device) => {
        const identity = { identityKey: device.deviceKey, profile: { displayName: device.profile?.displayName } };
        return (
          <IdentityListItem
            key={device.deviceKey.toHex()}
            identity={identity}
            onClick={onSelect && (() => onSelect(device))}
          />
        );
      })}
    </ul>
  );
};
