//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { ExplorerContainer } from '../components';
import { meta } from '../meta';
import { Graph } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${meta.id}/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: DataType.View } =>
        Obj.instanceOf(DataType.View, data.subject) && Obj.instanceOf(Graph.Graph, data.subject.presentation.target),
      component: ({ data, role }) => {
        return <ExplorerContainer view={data.subject} role={role} />;
      },
    }),
  );
