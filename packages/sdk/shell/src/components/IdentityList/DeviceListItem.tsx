//
// Copyright 2023 DXOS.org
//

import { Compass, Desktop, DeviceMobile, Devices, DotsThree, type IconProps, Robot } from '@phosphor-icons/react';
import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { SpaceMember } from '@dxos/react-client/echo';
import { type Device, DeviceType, DeviceKind } from '@dxos/react-client/halo';
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
import { getSize, mx } from '@dxos/react-ui-theme';
import { keyToFallback } from '@dxos/util';

type DeviceListItemProps = {
  device: Device;
  presence?: SpaceMember['presence'];
  onClick?: () => void;
};

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
>(({ device, presence, onClick, classNames, ...props }, forwardedRef) => {
  const { t } = useTranslation('os');
  const fallbackValue = keyToFallback(device.deviceKey);
  const labelId = useId('identityListItem__label');
  const displayName =
    device.profile?.displayName ?? device.profile
      ? t('device name placeholder', { os: device.profile.os, platform: device.profile.platform })
      : generateName(device.deviceKey.toHex());
  return (
    <ListItem.Root
      {...props}
      classNames={mx('flex gap-2 items-center', onClick && 'cursor-pointer', classNames)}
      onClick={() => onClick?.()}
      data-testid='identity-list-item'
      labelId={labelId}
      ref={forwardedRef}
    >
      <Avatar.Root
        status={presence === SpaceMember.PresenceState.ONLINE ? 'active' : 'inactive'}
        labelId={labelId}
        hue={device.profile?.hue || fallbackValue.hue}
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
            <Avatar.Fallback text={device.profile?.emoji || fallbackValue.emoji} />
          )}
        </Avatar.Frame>
        {device.kind === DeviceKind.CURRENT && <Tag color='primary'>{t('current device tag label')}</Tag>}
        <Avatar.Label classNames='flex-1 text-sm truncate'>{displayName}</Avatar.Label>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant='ghost' classNames='pli-0 is-[--rail-action] bs-[--rail-action]'>
              <span className='sr-only'>{t('more options label')}</span>
              <DotsThree className={getSize(5)} />
            </Button>
          </DropdownMenu.Trigger>
        </DropdownMenu.Root>
      </Avatar.Root>
    </ListItem.Root>
  );
});
