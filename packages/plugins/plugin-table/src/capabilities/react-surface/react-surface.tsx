//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

import { TableCard, TableContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Capability.contributes(Common.Capability.ReactSurface, [
    Common.createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: Table.Table } => Obj.instanceOf(Table.Table, data.subject),
      component: ({ data, role, ref }) => <TableContainer object={data.subject} role={role} ref={ref} />,
    }),
    Common.createSurface({
      id: `${meta.id}/table-card`,
      role: ['card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion', 'card'],
      filter: (data): data is { subject: Table.Table } => Obj.instanceOf(Table.Table, data.subject),
      component: ({ data, role }) => <TableCard object={data.subject} role={role} />,
    }),
  ]),
);
