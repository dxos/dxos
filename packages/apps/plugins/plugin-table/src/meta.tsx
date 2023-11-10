//
// Copyright 2023 DXOS.org
//

import { Table } from '@phosphor-icons/react';
import React from 'react';

import { pluginMeta } from '@dxos/app-framework';

export const TABLE_PLUGIN = 'dxos.org/plugin/table';

export default pluginMeta({
  id: TABLE_PLUGIN,
  name: 'Tables',
  iconComponent: (props) => <Table {...props} />,
});
