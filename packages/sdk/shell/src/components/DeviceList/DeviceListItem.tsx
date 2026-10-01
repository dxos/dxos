//
// Copyright 2023 DXOS.org
//

import React, { type ComponentPropsWithoutRef, forwardRef } from 'react';

import { generateName } from '@dxos/display-name';
import { ConnectionState } from '@dxos/react-client/mesh';
import { type ThemedClassName, useId, useTranslation } from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list/next';
import { Next } from '@dxos/react-ui/next';
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
  ThemedClassName<ComponentPropsWithoutRef<'li'>> &
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
    const { t } = useTranslation(translationKey);
    const fallbackValue = hexToFallback(device.key);
    const labelId = useId('identityListItem__label');
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
        <Next.Avatar.Root labelId={labelId}>
          <Next.Avatar.Content
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
          <Next.Avatar.Label classNames='flex-1 text-sm truncate'>{displayName}</Next.Avatar.Label>
          {isCurrent && <Next.Tag color='primary'>{t('current-device-tag.label')}</Next.Tag>}
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
            <Next.Menu.Root>
              <Next.Menu.Trigger asChild>
                <Next.Button
                  variant='ghost'
                  classNames='px-0 w-(--dx-rail-action) h-(--dx-rail-action)'
                  data-testid={`device-list-item${isCurrent ? '-current' : ''}.options`}
                >
                  <span className='sr-only'>{t('more-options.label')}</span>
                  <Next.Icon icon='ph--dots-three--regular' />
                </Next.Button>
              </Next.Menu.Trigger>
              <Next.Menu.Content>
                {/* <Menu.Item disabled onClick={onClickEdit}> */}
                {/*  <PencilSimpleLine className={getSize(5)} /> */}
                {/*  {t('edit-device.label')} */}
                {/* </Menu.Item> */}
                {onClickJoinExisting && (
                  <Next.Menu.Item
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
                  <Next.Menu.Item
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
                  <Next.Menu.Item
                    data-testid='device-list-item-current.reset'
                    onClick={onClickReset}
                    item={{
                      value: t('reset-device.label'),
                      label: t('reset-device.label'),
                      icon: 'ph--power--regular',
                    }}
                  />
                )}
              </Next.Menu.Content>
            </Next.Menu.Root>
          )}
        </Next.Avatar.Root>
      </Listbox.Item>
    );
  },
);
