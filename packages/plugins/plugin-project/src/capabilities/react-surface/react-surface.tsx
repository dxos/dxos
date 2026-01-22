//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { InvocationTraceContainer } from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { Project } from '@dxos/types';

import { ProjectContainer, ProjectObjectSettings } from '../../components';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      Common.createSurface({
        id: meta.id,
        role: 'article',
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data, role }) => <ProjectContainer role={role} project={data.subject} />,
      }),
      Common.createSurface({
        id: `${meta.id}/companion/invocations`,
        role: 'article',
        filter: (data): data is { companionTo: Project.Project } =>
          Obj.instanceOf(Project.Project, data.companionTo) && data.subject === 'invocations',
        component: ({ data }) => {
          const db = Obj.getDatabase(data.companionTo);
          // TODO(wittjosiah): Filter the invocations to those relevant to the project.
          return (
            <StackItem.Content>
              <InvocationTraceContainer db={db} detailAxis='block' />
            </StackItem.Content>
          );
        },
      }),
      Common.createSurface({
        id: `${meta.id}/object-settings`,
        role: 'object-settings',
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data }) => <ProjectObjectSettings project={data.subject} />,
      }),
    ]),
  ),
);
