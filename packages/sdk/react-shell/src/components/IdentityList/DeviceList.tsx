//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { List, useTranslation } from '@dxos/react-ui';
import { descriptionText, mx } from '@dxos/react-ui-theme';

import { IdentityListItem } from './IdentityListItem';

export interface DeviceListProps {
  devices: Device[];
  onSelect?: (device: Device) => void;
}

export const DeviceList = ({ devices, onSelect }: DeviceListProps) => {
  const { t } = useTranslation('os');
  return devices.length > 0 ? (
    <List classNames='flex flex-col gap-2'>
      {devices.map((device) => {
        const identity = {
          identityKey: device.deviceKey,
          profile: {
            displayName: `${device.profile?.platform} (${device.profile?.platformVersion}) on ${device.profile?.os} (${
              device.profile?.osVersion
            }) ${device.profile?.architecture ?? 'Unknown'}-bit`,
          },
        };
        return (
          <IdentityListItem
            key={device.deviceKey.toHex()}
            identity={identity}
            onClick={onSelect && (() => onSelect(device))}
          />
        );
      })}
    </List>
  ) : (
    <div role='none' className='grow flex items-center p-2'>
      <p className={mx(descriptionText, 'text-center is-full')}>{t('empty device list message')}</p>
    </div>
  );
};
