//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, createSurface } from '@dxos/app-framework';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { getSpace } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { ProjectContainer, ProjectObjectSettings } from '../components';
import { meta } from '../meta';

export default () =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: meta.id,
      role: 'article',
      filter: (data): data is { subject: DataType.Project.Project } =>
        Obj.instanceOf(DataType.Project.Project, data.subject),
      component: ({ data, role }) => <ProjectContainer role={role} project={data.subject} />,
    }),
    createSurface({
      id: `${meta.id}/companion/invocations`,
      role: 'article',
      filter: (data): data is { companionTo: DataType.Project.Project } =>
        Obj.instanceOf(DataType.Project.Project, data.companionTo) && data.subject === 'invocations',
      component: ({ data }) => {
        const space = getSpace(data.companionTo);
        // TODO(wittjosiah): Filter the invocations to those relevant to the project.
        return (
          <StackItem.Content>
            <InvocationTraceContainer space={space} detailAxis='block' />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/object-settings`,
      role: 'object-settings',
      filter: (data): data is { subject: DataType.Project.Project } =>
        Obj.instanceOf(DataType.Project.Project, data.subject),
      component: ({ data }) => <ProjectObjectSettings project={data.subject} />,
    }),
  ]);
