//
// Copyright 2023 DXOS.org
//

import { CaretRight, Database, Plus, Power } from '@phosphor-icons/react';
import React from 'react';

import { type Device } from '@dxos/react-client/halo';
import { Avatar, Button, List, useTranslation, Tooltip } from '@dxos/react-ui';
import { descriptionText, getSize, mx } from '@dxos/react-ui-theme';

import { DeviceListItem } from './DeviceListItem';
import { type DeviceListProps, type AgentFormProps } from './DeviceListProps';

export const DeviceList = ({
  devices,
  onClickAdd,
  onClickEdit,
  onClickReset,
  onClickJoinExisting,
  agentStatus,
  agentActive,
  agentHostingEnabled,
  onAgentDestroy,
  onAgentCreate,
  validationMessage,
}: DeviceListProps & AgentFormProps) => {
  const { t } = useTranslation('os');
  return (
    <>
      <h2 className={mx(descriptionText, 'text-center mbs-4')}>{t('devices heading')}</h2>
      {devices.length > 0 && (
        <List>
          {devices.map((device: Device) => {
            return (
              <DeviceListItem
                key={device.deviceKey.toHex()}
                device={device}
                onClickEdit={() => onClickEdit?.(device)}
                {...{ onClickReset, onClickJoinExisting }}
              />
            );
          })}
        </List>
      )}
      <Button
        variant='ghost'
        classNames='justify-start gap-2 !pis-0 !pie-3'
        data-testid='devices-panel.create-invitation'
        onClick={onClickAdd}
      >
        <div role='img' className={mx(getSize(8), 'm-1 rounded-sm surface-input grid place-items-center')}>
          <Plus weight='light' className={getSize(6)} />
        </div>
        <span className='grow font-medium text-start'>{t('choose add device label')}</span>
        <CaretRight weight='bold' className={getSize(4)} />
      </Button>
      {agentHostingEnabled && (
        <>
          <h2 className={mx(descriptionText, 'text-center mbs-4')}>{t('agent heading')}</h2>
          {agentActive ? (
            <div role='group' className='flex gap-2 items-center'>
              <Avatar.Root status={agentStatus ? 'active' : 'inactive'} variant='square'>
                <Avatar.Frame classNames='place-self-center'>
                  <Database weight='duotone' width={24} height={24} x={8} y={8} />
                </Avatar.Frame>
                <Avatar.Label classNames='flex-1 text-sm truncate'>{t('agent device label')}</Avatar.Label>
              </Avatar.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <Button
                    variant='ghost'
                    classNames='pli-0 is-[--rail-action] bs-[--rail-action]'
                    data-testid='agent.destroy'
                    onClick={onAgentDestroy}
                  >
                    <span className='sr-only'>{t('destroy agent label')}</span>
                    <Power className={getSize(5)} />
                  </Button>
                </Tooltip.Trigger>
                <Tooltip.Portal>
                  <Tooltip.Content side='bottom' classNames='z-50'>
                    {t('destroy agent label')}
                  </Tooltip.Content>
                </Tooltip.Portal>
              </Tooltip.Root>
            </div>
          ) : (
            <>
              <Button
                variant='ghost'
                classNames='mlb-2 is-full justify-start gap-2 !pis-0 !pie-3'
                data-testid='devices-panel.create-agent'
                onClick={onAgentCreate}
                aria-describedby='devices-panel.create-agent.description'
              >
                <div role='img' className={mx(getSize(8), 'm-1 rounded-sm surface-input grid place-items-center')}>
                  <Plus weight='light' className={getSize(6)} />
                </div>
                <span className='grow font-medium text-start'>{t('create agent label')}</span>
              </Button>
              <p id='devices-panel.create-agent.description' className={descriptionText}>
                {t('agent message body')}
              </p>
            </>
          )}
        </>
      )}
    </>
  );
};
