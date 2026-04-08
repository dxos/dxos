//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Table } from '@dxos/react-ui-table/types';

import { TableCard, TableContainer } from '#containers';
import { meta } from '#meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}.table`,
        role: ['article', 'section', 'slide'],
        filter: AppSurface.object(Table.Table, { attendable: true }),
        component: ({ data, role }) => (
          <TableContainer role={role} subject={data.subject} attendableId={data.attendableId} />
        ),
      }),
      Surface.create({
        id: `${meta.id}.table-card`,
        role: ['card--content'],
        filter: AppSurface.object(Table.Table),
        component: ({ data, role }) => <TableCard subject={data.subject} role={role} />,
      }),
    ]),
  ),
);
