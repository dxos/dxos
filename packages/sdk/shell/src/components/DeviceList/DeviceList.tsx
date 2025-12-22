//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { Button, Icon, List, useTranslation } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/ui-theme';

import { DeviceListItem } from './DeviceListItem';
import { type AgentFormProps, type DeviceListProps } from './DeviceListProps';

export const DeviceList = ({
  devices,
  connectionState,
  onClickAdd,
  onClickEdit,
  onClickReset,
  onClickRecover,
  onClickJoinExisting,
  onAgentDestroy,
}: DeviceListProps & Partial<Pick<AgentFormProps, 'onAgentDestroy'>>) => {
  const { t } = useTranslation('os');
  return (
    <div role='none' className='p-1'>
      <h2 className={mx(descriptionText, 'text-center mbs-2')}>{t('devices heading')}</h2>
      {devices.length > 0 && (
        <List>
          {devices.map((device: Device) => {
            return (
              <DeviceListItem
                key={device.deviceKey.toHex()}
                device={device}
                onClickEdit={() => onClickEdit?.(device)}
                {...{ onClickReset, onClickRecover, onClickJoinExisting, connectionState, onAgentDestroy }}
              />
            );
          })}
        </List>
      )}
      <Button
        variant='ghost'
        classNames='justify-start gap-2 pis-0 pie-3 is-full'
        data-testid='devices-panel.create-invitation'
        onClick={onClickAdd}
      >
        <div role='img' className={mx(getSize(8), 'm-1 rounded-sm bg-inputSurface grid place-items-center')}>
          <Icon icon='ph--plus--light' size={6} />
        </div>
        <span className='grow font-medium text-start'>{t('choose add device label')}</span>
        <Icon icon='ph--caret-right--bold' size={4} />
      </Button>
    </div>
  );
};
