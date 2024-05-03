//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { useDevices, Device, DeviceKind, DeviceType } from '@dxos/react-client/halo';
import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';

import { MasterDetailTable, PanelContainer } from '../../../components';

const { helper, builder } = createColumnBuilder<Device>();
const columns: TableColumnDef<Device, any>[] = [
  helper.accessor((device) => device.deviceKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor(
    (device) => (device?.kind === DeviceKind.CURRENT ? 'THIS DEVICE' : Device.PresenceState[device.presence]),
    {
      id: 'state',
      size: 80,
      cell: (cell) => (
        <div
          className={cell.row.original.presence === Device.PresenceState.ONLINE ? 'text-green-500' : 'text-neutral-500'}
        >
          {cell.getValue()}
        </div>
      ),
    },
  ),
  helper.accessor((device) => DeviceType[device.profile?.type || DeviceType.UNKNOWN], { id: 'type', size: 80 }),
  helper.accessor((device) => device.profile?.label, { id: 'label', size: 120 }),
];

export const DeviceListPanel = () => {
  const devices = useDevices();

  return <PanelContainer>{<MasterDetailTable<Device> columns={columns} data={devices} />}</PanelContainer>;
};
