//
// Copyright 2023 DXOS.org
//

import React, { useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { Listbox } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';

import { translationKey } from '../../translations.ts';
import { DeviceListItem } from './DeviceListItem.tsx';
import { type DeviceListProps, type ShellDevice } from './DeviceListProps.ts';

type Translate = ReturnType<typeof Hooks.useTranslation>['t'];

/** The device's own name, else its OS and platform, else a name derived from its key. */
export const deviceDisplayName = (device: ShellDevice, t: Translate): string =>
  device.label ??
  (device.os || device.platform
    ? t('device-name.placeholder', { os: device.os, platform: device.platform })
    : generateName(device.key));

/** The identity's devices as a Listbox: the arrow keys move through the rows; the current device carries its menu. */
export const DeviceList = ({
  devices,
  connectionState,
  onClickReset,
  onClickRecover,
  onClickJoinExisting,
}: DeviceListProps) => {
  const { t } = Hooks.useTranslation(translationKey);
  const items = useMemo(
    () => devices.map((device) => ({ value: device.key, label: deviceDisplayName(device, t) })),
    [devices, t],
  );
  return (
    <Listbox.Root items={items}>
      <Listbox.Content aria-label={t('device-list.heading')} data-testid='device-list'>
        {devices.map((device) => (
          <DeviceListItem
            key={device.key}
            device={device}
            {...{ connectionState, onClickReset, onClickRecover, onClickJoinExisting }}
          />
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};
