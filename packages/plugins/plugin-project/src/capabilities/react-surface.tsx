//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { DataType } from '@dxos/schema';

import { ProjectContainer, ProjectSettings } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: DataType.Project } => Obj.instanceOf(DataType.Project, data.subject),
      component: ({ data, role }) => <ProjectContainer role={role} project={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: DataType.Project } => Obj.instanceOf(DataType.Project, data.subject),
      component: ({ data }) => <ProjectSettings project={data.subject} />,
    }),
  ]);
