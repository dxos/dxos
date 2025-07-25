//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { TableView } from '@dxos/react-ui-table/types';
import { DataType } from '@dxos/schema';

import { TableContainer, TablePreview } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${meta.id}/table`,
      role: ['article', 'section', 'slide'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(TableView, data.subject.presentation.target),
      component: ({ data, role }) => <TableContainer view={data.subject} role={role} />,
    }),
    createSurface({
      id: `${meta.id}/table-preview`,
      role: ['card--intrinsic', 'card--extrinsic', 'popover', 'transclusion', 'card'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(TableView, data.subject.presentation.target),
      component: ({ data, role }) => <TablePreview view={data.subject} role={role} />,
    }),
  ]);
