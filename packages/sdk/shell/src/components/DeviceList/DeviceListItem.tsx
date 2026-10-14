//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { ConnectionState } from '@dxos/react-client/mesh';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { type DeviceListItemProps, type ShellDevice } from './DeviceListProps.ts';

/** Icon per device kind; an unreported kind falls back to the key-derived emoji. */
const KIND_ICONS: Record<NonNullable<ShellDevice['kind']>, string> = {
  'unknown': 'ph--devices--regular',
  'browser': 'ph--compass--regular',
  'native': 'ph--desktop--regular',
  'mobile': 'ph--device-mobile--regular',
  'agent': 'ph--drone--regular',
  'agent-managed': 'ph--database--regular',
};

/**
 * One device as a Listbox row: the kind's tile in the leading cell, the name, then the current device's tag and its
 * options menu as trailing controls.
 */
export const DeviceListItem = forwardRef<
  HTMLDivElement,
  Util.ThemedClassName<ComponentPropsWithoutRef<'div'>> & DeviceListItemProps
>(({ device, onClickReset, onClickRecover, onClickJoinExisting, connectionState, ...props }, forwardedRef) => {
  const { t } = Hooks.useTranslation(translationKey);
  const fallbackValue = hexToFallback(device.key);
  const isCurrent = device.current;
  return (
    <Listbox.Item
      {...props}
      id={device.key}
      data-testid={`device-list-item${isCurrent ? '-current' : ''}`}
      ref={forwardedRef}
    >
      <Listbox.ItemIcon>
        <Avatar.Root
          status={
            isCurrent && connectionState === ConnectionState.OFFLINE
              ? 'error'
              : device.presence === 'online'
                ? 'active'
                : 'inactive'
          }
          hue={Avatar.toAvatarHue(fallbackValue.hue)}
          variant='square'
          {...(device.kind ? { icon: KIND_ICONS[device.kind] } : { fallback: fallbackValue.emoji })}
        />
      </Listbox.ItemIcon>
      <Listbox.ItemText />
      {isCurrent && <Tag.Tag color='primary'>{t('current-device-tag.label')}</Tag.Tag>}
      {isCurrent && (onClickJoinExisting || onClickRecover || onClickReset) && (
        <Menu.Root>
          <Menu.Trigger asChild>
            <Button.Root
              variant='ghost'
              icon='ph--dots-three--regular'
              iconOnly
              label={t('more-options.label')}
              data-testid={`device-list-item${isCurrent ? '-current' : ''}.options`}
            />
          </Menu.Trigger>
          <Menu.Content>
            {/* <Menu.Item disabled onClick={onClickEdit}> */}
            {/*  <PencilSimpleLine className={getSize(5)} /> */}
            {/*  {t('edit-device.label')} */}
            {/* </Menu.Item> */}
            {onClickJoinExisting && (
              <Menu.Item
                data-testid='device-list-item-current.join-existing'
                onClick={onClickJoinExisting}
                item={{
                  value: t('choose-join-new-identity.label'),
                  label: t('choose-join-new-identity.label'),
                  icon: 'ph--share-fat--regular',
                }}
              />
            )}
            {onClickRecover && (
              <Menu.Item
                data-testid='device-list-item-current.recover'
                onClick={onClickRecover}
                item={{
                  value: t('choose-recover-identity.label'),
                  label: t('choose-recover-identity.label'),
                  icon: 'ph--first-aid-kit--regular',
                }}
              />
            )}
            {onClickReset && (
              <Menu.Item
                data-testid='device-list-item-current.reset'
                onClick={onClickReset}
                item={{
                  value: t('reset-device.label'),
                  label: t('reset-device.label'),
                  icon: 'ph--power--regular',
                }}
              />
            )}
          </Menu.Content>
        </Menu.Root>
      )}
    </Listbox.Item>
  );
});
