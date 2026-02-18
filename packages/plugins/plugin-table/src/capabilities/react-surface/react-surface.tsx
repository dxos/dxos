//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { Table } from '@dxos/react-ui-table/types';

import { TableCard, TableContainer } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/table`,
        role: ['article', 'section', 'slide'],
        filter: (data): data is { subject: Table.Table } => Obj.instanceOf(Table.Table, data.subject),
        component: ({ data, role, ref }) => <TableContainer role={role} subject={data.subject} ref={ref} />,
      }),
      Surface.create({
        id: `${meta.id}/table-card`,
        role: ['card--intrinsic', 'card--extrinsic', 'card--popover', 'card--transclusion', 'card'],
        filter: (data): data is { subject: Table.Table } => Obj.instanceOf(Table.Table, data.subject),
        component: ({ data, role }) => <TableCard object={data.subject} role={role} />,
      }),
    ]),
  ),
);
