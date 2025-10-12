//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';

import { ExplorerContainer } from '../components';
import { meta } from '../meta';
import { ViewType } from '../types';

export default () =>
  contributes(
    Capabilities.ReactSurface,
    createSurface({
      id: `${meta.id}/article`,
      role: ['article', 'section'],
      filter: (data): data is { subject: ViewType } => Obj.instanceOf(ViewType, data.subject),
      component: ({ data, role }) => <ExplorerContainer view={data.subject} role={role} />,
    }),
  );
