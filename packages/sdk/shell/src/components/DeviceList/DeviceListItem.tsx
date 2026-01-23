//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { Device, DeviceKind, DeviceType } from '@dxos/react-client/halo';
import { ConnectionState } from '@dxos/react-client/mesh';
import {
  Avatar,
  Button,
  DropdownMenu,
  Icon,
  ListItem,
  Tag,
  type ThemedClassName,
  useId,
  useTranslation,
} from '@dxos/react-ui';
import { keyToFallback } from '@dxos/util';

import { translationKey } from '../../translations';

import { type AgentFormProps, type DeviceListItemProps } from './DeviceListProps';

export const DeviceListItem = forwardRef<
  HTMLLIElement,
  ThemedClassName<ComponentPropsWithoutRef<'li'>> &
    DeviceListItemProps &
    Partial<Pick<AgentFormProps, 'onAgentDestroy'>>
>(
  (
    {
      device,
      onClickAdd,
      onClickEdit,
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
    const { t } = useTranslation(translationKey);
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
        <Avatar.Root labelId={labelId}>
          <Avatar.Content
            status={
              isCurrent && connectionState === ConnectionState.OFFLINE
                ? 'error'
                : device.presence === Device.PresenceState.ONLINE
                  ? 'active'
                  : 'inactive'
            }
            hue={fallbackValue.hue}
            variant='square'
            classNames='place-self-center'
            {...(device.profile?.type
              ? {
                  icon:
                    device.profile.type === DeviceType.AGENT_MANAGED
                      ? 'ph--database--regular'
                      : device.profile.type === DeviceType.BROWSER
                        ? 'ph--compass--regular'
                        : device.profile.type === DeviceType.NATIVE
                          ? 'ph--desktop--regular'
                          : [DeviceType.AGENT, DeviceType.AGENT_MANAGED].includes(device.profile.type)
                            ? 'ph--robot--regular'
                            : device.profile.type === DeviceType.MOBILE
                              ? 'ph--device-mobile--regular'
                              : 'ph--devices--regular',
                }
              : { fallback: fallbackValue.emoji })}
          />
          <Avatar.Label classNames='flex-1 text-sm truncate'>{displayName}</Avatar.Label>
          {isCurrent && <Tag color='primary'>{t('current device tag label')}</Tag>}
          {/* TODO(wittjosiah): EDGE agents cannot current be turned off. */}
          {/* {device.profile?.type === DeviceType.AGENT_MANAGED && (
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
          )} */}
          {device.kind === DeviceKind.CURRENT && (onClickJoinExisting || onClickRecover || onClickReset) && (
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  variant='ghost'
                  classNames='pli-0 is-[--rail-action] bs-[--rail-action]'
                  data-testid={`device-list-item${isCurrent ? '-current' : ''}.options`}
                >
                  <span className='sr-only'>{t('more options label')}</span>
                  <Icon icon='ph--dots-three--regular' size={5} />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  {/* <DropdownMenu.Item disabled onClick={onClickEdit}> */}
                  {/*  <PencilSimpleLine className={getSize(5)} /> */}
                  {/*  {t('edit device label')} */}
                  {/* </DropdownMenu.Item> */}
                  {onClickJoinExisting && (
                    <DropdownMenu.Item
                      data-testid='device-list-item-current.join-existing'
                      onClick={onClickJoinExisting}
                    >
                      <Icon icon='ph--share-fat--regular' size={5} />
                      {t('choose join new identity label')}
                    </DropdownMenu.Item>
                  )}
                  {onClickRecover && (
                    <DropdownMenu.Item data-testid='device-list-item-current.recover' onClick={onClickRecover}>
                      <Icon icon='ph--first-aid-kit--regular' size={5} />
                      {t('choose recover identity label')}
                    </DropdownMenu.Item>
                  )}
                  {onClickReset && (
                    <DropdownMenu.Item data-testid='device-list-item-current.reset' onClick={onClickReset}>
                      <Icon icon='ph--power--regular' size={5} />
                      {t('reset device label')}
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Viewport>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          )}
        </Avatar.Root>
      </ListItem.Root>
    );
  },
);
