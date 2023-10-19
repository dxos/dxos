//
// Copyright 2020 DXOS.org
//

import React from 'react';

import { createColumnBuilder, type TableColumnDef } from '@dxos/react-ui-table';
import type { Device } from '@dxos/client/halo';
import { useDevices } from '@dxos/react-client/halo';

import { MasterDetailTable, PanelContainer } from '../../../components';

const { helper, builder } = createColumnBuilder<Device>();
const columns: TableColumnDef<Device, any>[] = [
  helper.accessor((device) => device.deviceKey, { id: 'key', ...builder.key({ tooltip: true }) }),
  helper.accessor('kind', builder.number()),
];

export const DeviceListPanel = () => {
  const devices = useDevices();

  return <PanelContainer>{<MasterDetailTable<Device> columns={columns} data={devices} />}</PanelContainer>;
};
