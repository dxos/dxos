//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { FormatEnum } from '@dxos/echo/internal';
import { Device, DeviceKind, DeviceType, useDevices } from '@dxos/react-client/halo';
import { type TablePropertyDefinition } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';

export const DeviceListPanel = () => {
  const devices = useDevices();

  const properties: TablePropertyDefinition[] = useMemo(
    () => [
      { name: 'key', format: FormatEnum.DID },
      {
        name: 'state',
        format: FormatEnum.SingleSelect,
        size: 150,
        config: {
          options: [
            { id: 'THIS DEVICE', title: 'THIS DEVICE', color: 'green' },
            { id: 'ONLINE', title: 'ONLINE', color: 'green' },
            { id: 'OFFLINE', title: 'OFFLINE', color: 'neutral' },
          ],
        },
      },
      {
        name: 'type',
        format: FormatEnum.SingleSelect,
        size: 180,
        config: {
          options: Object.entries(DeviceType)
            .filter(([key]) => isNaN(Number(key)))
            .map(([key]) => ({ id: key, title: key, color: 'neutral' })),
        },
      },
      { name: 'label', format: FormatEnum.String, size: 180 },
    ],
    [],
  );

  const data = useMemo(
    () =>
      devices.map((device) => ({
        id: device.deviceKey.toString(),
        key: device.deviceKey.toString(),
        state: device.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence],
        type: DeviceType[device.profile?.type || DeviceType.UNKNOWN],
        label: device.profile?.label,
        _original: device,
      })),
    [devices],
  );

  return (
    <PanelContainer>
      <MasterDetailTable
        properties={properties}
        data={data}
        detailsTransform={(d) => d._original}
        detailsPosition='bottom'
      />
    </PanelContainer>
  );
};
