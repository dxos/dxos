//
// Copyright 2023 DXOS.org
//

import { CaretRight, Plus } from '@phosphor-icons/react';
import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { Button, List, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';

import { DeviceListItem } from './DeviceListItem';

export interface DeviceListProps {
  devices: Device[];
}

export const DeviceList = ({ devices }: DeviceListProps) => {
  const { t } = useTranslation('os');
  return (
    <>
      <h2 className={mx(descriptionText, 'text-center')}>{t('devices heading')}</h2>
      {devices.length > 0 && (
        <List>
          {devices.map((device) => {
            return <DeviceListItem key={device.deviceKey.toHex()} device={device} />;
          })}
        </List>
      )}
      <Button variant='ghost' classNames='justify-start gap-2 pis-0 pie-3'>
        <div role='img' className={mx(getSize(8), 'm-1 rounded-sm surface-input grid place-items-center')}>
          <Plus weight='light' className={getSize(6)} />
        </div>
        <span className='grow font-medium text-start'>{t('choose add device label')}</span>
        <CaretRight weight='bold' className={getSize(4)} />
      </Button>
    </>
  );
};
