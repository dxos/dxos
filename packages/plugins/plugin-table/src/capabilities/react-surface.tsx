//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { TableType } from '@dxos/react-ui-table';

import { TableContainer, TableViewEditor } from '../components';
import { TABLE_PLUGIN } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${TABLE_PLUGIN}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
      component: ({ data, role }) => <TableContainer table={data.subject} role={role} />,
    }),
    createSurface({
      id: `${TABLE_PLUGIN}/settings-panel`,
      role: 'complementary--settings',
      filter: (data): data is { subject: TableType } => data.subject instanceof TableType,
      component: ({ data }) => <TableViewEditor table={data.subject} />,
    }),
  ]);
