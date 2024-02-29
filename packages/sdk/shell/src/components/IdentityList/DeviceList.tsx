//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { generateName } from '@dxos/display-name';
import { type Device, DeviceType } from '@dxos/react-client/halo';
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
        // TODO(wittjosiah): Render this better. Consider communicating these as apps rather than devices.
        const deviceType = device.profile?.type || DeviceType.UNKNOWN;
        const displayName = device.profile?.label
          ? `${device.profile.label} (${DeviceType[deviceType]})`
          : generateName(device.deviceKey.toHex());

        const identity = {
          identityKey: device.deviceKey,
          profile: { displayName },
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
