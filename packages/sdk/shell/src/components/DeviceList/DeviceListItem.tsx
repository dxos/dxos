//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { ConnectionState } from '@dxos/react-client/mesh';
import { Listbox } from '@dxos/react-ui-list';
import * as Avatar from '@dxos/react-ui/Avatar';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import * as Tag from '@dxos/react-ui/Tag';
import type * as Util from '@dxos/react-ui/Util';
import { hexToFallback } from '@dxos/util';

import { translationKey } from '../../translations.ts';
import { type AgentFormProps, type DeviceListItemProps, type ShellDevice } from './DeviceListProps.ts';

/** Icon per device kind; an unreported kind falls back to the key-derived emoji. */
const KIND_ICONS: Record<NonNullable<ShellDevice['kind']>, string> = {
  'unknown': 'ph--devices--regular',
  'browser': 'ph--compass--regular',
  'native': 'ph--desktop--regular',
  'mobile': 'ph--device-mobile--regular',
  'agent': 'ph--drone--regular',
  'agent-managed': 'ph--database--regular',
};

export const DeviceListItem = forwardRef<
  HTMLLIElement,
  Util.ThemedClassName<ComponentPropsWithoutRef<'li'>> &
    DeviceListItemProps &
    Partial<Pick<AgentFormProps, 'onAgentDestroy'>>
>(
  (
    {
      device,
      onClickAdd, // TODO(burdon): Not used.
      onClickEdit, // TODO(burdon): Not used.
      onClickReset,
      onClickRecover,
      onClickJoinExisting,
      classNames,
      connectionState,
      onAgentDestroy: _,
      ...props
    },
    forwardedRef,
  ) => {
    const { t } = Hooks.useTranslation(translationKey);
    const fallbackValue = hexToFallback(device.key);
    const labelId = Hooks.useId('identityListItem__label');
    const displayName =
      device.label ??
      (device.os || device.platform
        ? t('device-name.placeholder', { os: device.os, platform: device.platform })
        : generateName(device.key));
    const isCurrent = device.current;
    return (
      <Listbox.Item
        {...props}
        id={device.key}
        classNames={['flex gap-2 items-center my-2', classNames]}
        data-testid={`device-list-item${isCurrent ? '-current' : ''}`}
        ref={forwardedRef}
      >
        <Avatar.Root labelId={labelId}>
          <Avatar.Content
            status={
              isCurrent && connectionState === ConnectionState.OFFLINE
                ? 'error'
                : device.presence === 'online'
                  ? 'active'
                  : 'inactive'
            }
            hue={fallbackValue.hue}
            variant='square'
            classNames='place-self-center'
            {...(device.kind ? { icon: KIND_ICONS[device.kind] } : { fallback: fallbackValue.emoji })}
          />
          <Avatar.Label classNames='flex-1 text-sm truncate'>{displayName}</Avatar.Label>
          {isCurrent && <Tag.Root color='primary'>{t('current-device-tag.label')}</Tag.Root>}
          {/* TODO(wittjosiah): EDGE agents cannot current be turned off. */}
          {/* {device.profile?.type === DeviceType.AGENT_MANAGED && (
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <Button
                  variant='ghost'
                  classNames='px-0 w-(--dx-rail-action) h-(--dx-rail-action)'
                  data-testid='agent.destroy'
                  onClick={onAgentDestroy}
                >
                  <span className='sr-only'>{t('destroy-agent.label')}</span>
                  <Power className={getSize(5)} />
                </Button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content side='bottom'>
                  {t('destroy-agent.label')}
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          )} */}
          {isCurrent && (onClickJoinExisting || onClickRecover || onClickReset) && (
            <Menu.Root>
              <Menu.Trigger asChild>
                <Button.Root
                  variant='ghost'
                  classNames='px-0 w-(--dx-rail-action) h-(--dx-rail-action)'
                  data-testid={`device-list-item${isCurrent ? '-current' : ''}.options`}
                >
                  <span className='sr-only'>{t('more-options.label')}</span>
                  <Icon.Root icon='ph--dots-three--regular' />
                </Button.Root>
              </Menu.Trigger>
              <Menu.Content>
                <Menu.Viewport>
                  {/* <Menu.Item disabled onClick={onClickEdit}> */}
                  {/*  <PencilSimpleLine className={getSize(5)} /> */}
                  {/*  {t('edit-device.label')} */}
                  {/* </Menu.Item> */}
                  {onClickJoinExisting && (
                    <Menu.Item data-testid='device-list-item-current.join-existing' onClick={onClickJoinExisting}>
                      <Icon.Root icon='ph--share-fat--regular' />
                      {t('choose-join-new-identity.label')}
                    </Menu.Item>
                  )}
                  {onClickRecover && (
                    <Menu.Item data-testid='device-list-item-current.recover' onClick={onClickRecover}>
                      <Icon.Root icon='ph--first-aid-kit--regular' />
                      {t('choose-recover-identity.label')}
                    </Menu.Item>
                  )}
                  {onClickReset && (
                    <Menu.Item data-testid='device-list-item-current.reset' onClick={onClickReset}>
                      <Icon.Root icon='ph--power--regular' />
                      {t('reset-device.label')}
                    </Menu.Item>
                  )}
                </Menu.Viewport>
              </Menu.Content>
            </Menu.Root>
          )}
        </Avatar.Root>
      </Listbox.Item>
    );
  },
);
