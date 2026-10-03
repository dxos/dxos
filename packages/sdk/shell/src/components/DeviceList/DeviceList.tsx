//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { Listbox } from '@dxos/react-ui-list';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { getSize, mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations.ts';
import { DeviceListItem } from './DeviceListItem.tsx';
import { type AgentFormProps, type DeviceListProps } from './DeviceListProps.ts';
import { toShellDevice } from './toShellDevice.ts';

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
  const { t } = Hooks.useTranslation(translationKey);
  return (
    <div className='p-1'>
      <h2 className={mx('text-fg-muted', 'text-center mt-2')}>{t('devices.heading')}</h2>
      {devices.length > 0 && (
        <Listbox.Root
          items={devices.map((device) => {
            const { key, label } = toShellDevice(device);
            return { value: key, label: label ?? key };
          })}
        >
          <Listbox.Content aria-label={t('device-list.heading')}>
            {devices.map((device: Device) => {
              const shellDevice = toShellDevice(device);
              return (
                <DeviceListItem
                  key={shellDevice.key}
                  device={shellDevice}
                  onClickEdit={() => onClickEdit?.(device)}
                  {...{ onClickReset, onClickRecover, onClickJoinExisting, connectionState, onAgentDestroy }}
                />
              );
            })}
          </Listbox.Content>
        </Listbox.Root>
      )}
      <Button.Button
        variant='ghost'
        classNames='justify-start gap-2 ps-0 pe-3 w-full'
        data-testid='devices-panel.create-invitation'
        onClick={onClickAdd}
      >
        <div role='img' className={mx(getSize(8), 'm-1 rounded-xs bg-input-surface grid place-items-center')}>
          <Icon.Icon icon='ph--plus--light' size='xl' />
        </div>
        <span className='grow font-medium text-start'>{t('choose-add-device.label')}</span>
        <Icon.Icon icon='ph--caret-right--bold' size='md' />
      </Button.Button>
    </div>
  );
};
