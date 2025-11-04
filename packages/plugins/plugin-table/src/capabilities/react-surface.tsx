//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';

import { TableCard, TableContainer } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DataType.View.View } =>
        Obj.instanceOf(DataType.View.View, data.subject) && Obj.instanceOf(Table.Table, data.subject.presentation.target),
      component: ({ data, role }) => <TableContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/table-card`,
      role: ['card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion', 'card'],
      filter: (data): data is { subject: DataType.View.View } =>
        Obj.instanceOf(DataType.View.View, data.subject) && Obj.instanceOf(Table.Table, data.subject.presentation.target),
      component: ({ data, role }) => <TableCard view={data.subject} role={role} />,
    }),
  ]);
