//
// Copyright 2023 DXOS.org
//

import {
  type IconProps,
  Compass,
  Desktop,
  DeviceMobile,
  Devices,
  DotsThree,
  ShareFat,
  Power,
  Robot,
} from '@phosphor-icons/react';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { Device, DeviceType, DeviceKind } from '@dxos/react-client/halo';
import { ConnectionState } from '@dxos/react-client/mesh';
import {
  ListItem,
  Avatar,
  useId,
  type ThemedClassName,
  Tag,
  useTranslation,
  DropdownMenu,
  Button,
} from '@dxos/react-ui';
import { getSize } from '@dxos/react-ui-theme';
import { keyToFallback } from '@dxos/util';

import { type DeviceListItemProps } from './DeviceListProps';

const iconProps: IconProps = {
  weight: 'duotone',
  width: 24,
  height: 24,
  x: 8,
  y: 8,
};

export const DeviceListItem = forwardRef<
  HTMLLIElement,
  ThemedClassName<ComponentPropsWithoutRef<'li'>> & DeviceListItemProps
>(
  (
    { device, onClickAdd, onClickEdit, onClickReset, onClickJoinExisting, classNames, connectionState, ...props },
    forwardedRef,
  ) => {
    const { t } = useTranslation('os');
    const fallbackValue = keyToFallback(device.deviceKey);
    const labelId = useId('identityListItem__label');
    const displayName = device.profile
      ? t('device name placeholder', { os: device.profile.os, platform: device.profile.platform })
      : generateName(device.deviceKey.toHex());
    const isCurrent = device.kind === DeviceKind.CURRENT;
    return (
      <ListItem.Root
        {...props}
        classNames={['flex gap-2 items-center mlb-2', classNames]}
        data-testid={`device-list-item${isCurrent ? '-current' : ''}`}
        labelId={labelId}
        ref={forwardedRef}
      >
        <Avatar.Root
          status={
            isCurrent && connectionState === ConnectionState.OFFLINE
              ? 'error'
              : device.presence === Device.PresenceState.ONLINE
                ? 'active'
                : 'inactive'
          }
          labelId={labelId}
          hue={fallbackValue.hue}
          variant='square'
        >
          <Avatar.Frame classNames='place-self-center'>
            {device.profile?.type ? (
              device.profile.type === DeviceType.BROWSER ? (
                <Compass {...iconProps} />
              ) : device.profile.type === DeviceType.NATIVE ? (
                <Desktop {...iconProps} />
              ) : [DeviceType.AGENT, DeviceType.AGENT_MANAGED].includes(device.profile.type) ? (
                <Robot {...iconProps} />
              ) : device.profile.type === DeviceType.MOBILE ? (
                <DeviceMobile {...iconProps} />
              ) : (
                <Devices {...iconProps} />
              )
            ) : (
              <Avatar.Fallback text={fallbackValue.emoji} />
            )}
          </Avatar.Frame>
          <Avatar.Label classNames='flex-1 text-sm truncate'>{displayName}</Avatar.Label>
          {isCurrent && <Tag color='primary'>{t('current device tag label')}</Tag>}
          {device.kind === DeviceKind.CURRENT && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  variant='ghost'
                  classNames='pli-0 is-[--rail-action] bs-[--rail-action]'
                  data-testid={`device-list-item${isCurrent ? '-current' : ''}.options`}
                >
                  <span className='sr-only'>{t('more options label')}</span>
                  <DotsThree className={getSize(5)} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  {/* <DropdownMenu.Item disabled onClick={onClickEdit}> */}
                  {/*  <PencilSimpleLine className={getSize(5)} /> */}
                  {/*  {t('edit device label')} */}
                  {/* </DropdownMenu.Item> */}
                  <DropdownMenu.Item data-testid='device-list-item-current.join-existing' onClick={onClickJoinExisting}>
                    <ShareFat className={getSize(5)} />
                    {t('choose join new identity label')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item data-testid='device-list-item-current.reset' onClick={onClickReset}>
                    <Power className={getSize(5)} />
                    {t('reset device label')}
                  </DropdownMenu.Item>
                </DropdownMenu.Viewport>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </Avatar.Root>
      </ListItem.Root>
    );
  },
);
