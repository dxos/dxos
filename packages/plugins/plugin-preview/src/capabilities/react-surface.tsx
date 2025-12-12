//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, LayoutAction, contributes, createIntent, createSurface } from '@dxos/app-framework';
import { Surface, SurfaceCardRole, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useActiveSpace } from '@dxos/plugin-space';
import { type ProjectionModel } from '@dxos/schema';
import { Organization, Person, Project, Task } from '@dxos/types';

import { FormCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import { meta } from '../meta';
import { type CardPreviewProps } from '../types';

export default () =>
  contributes(Capabilities.ReactSurface, [
    //
    // Specific schema types.
    // TODO(burdon): Create helpers and factor out.
    //

    // TODO(burdon): Infer Role type.
    createSurface<{ subject: Person.Person }>({
      id: `${meta.id}/schema-popover--contact`,
      role: SurfaceCardRole.literals as any,
      filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
      component: ({ data, role }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const db = Obj.getDatabase(data.subject);
        const activeSpace = useActiveSpace(); // TODO(burdon): Disambiguate with space?
        const handleSelect = useCallback<NonNullable<CardPreviewProps['onSelect']>>(
          (object) =>
            dispatch(
              createIntent(LayoutAction.Open, {
                part: 'main',
                subject: [Obj.getDXN(object).toString()],
                options: {
                  workspace: db?.spaceId,
                },
              }),
            ),
          [dispatch],
        );

        return (
          <PersonCard
            role={role as SurfaceCardRole}
            subject={data.subject}
            db={activeSpace?.db}
            onSelect={handleSelect}
          >
            {role === 'card--popover' && <Surface role='related' data={data} />}
          </PersonCard>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--organization`,
      role: SurfaceCardRole.literals as any,
      filter: (data): data is { subject: Organization.Organization } =>
        Obj.instanceOf(Organization.Organization, data.subject),
      component: ({ data, role }) => {
        const activeSpace = useActiveSpace();
        return (
          <OrganizationCard role={role as SurfaceCardRole} subject={data.subject} db={activeSpace?.db}>
            {role === 'card--popover' && <Surface role='related' data={data} />}
          </OrganizationCard>
        );
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--project`,
      role: SurfaceCardRole.literals as any,
      filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
      component: ({ data, role }) => {
        const activeSpace = useActiveSpace();
        return <ProjectCard subject={data.subject} role={role as SurfaceCardRole} db={activeSpace?.db} />;
      },
    }),
    createSurface({
      id: `${meta.id}/schema-popover--task`,
      role: SurfaceCardRole.literals as any,
      filter: (data): data is { subject: Task.Task } => Obj.instanceOf(Task.Task, data.subject),
      component: ({ data, role }) => {
        return <TaskCard subject={data.subject} role={role as SurfaceCardRole} />;
      },
    }),

    //
    // Fallback for any object.
    //

    createSurface({
      id: `${meta.id}/fallback-popover`,
      role: SurfaceCardRole.literals as any,
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any; projection?: ProjectionModel } => Obj.isObject(data.subject),
      component: ({ data, role }) => {
        return <FormCard subject={data.subject} projection={data.projection} role={role as SurfaceCardRole} />;
      },
    }),

    createSurface({
      id: `${meta.id}/section`,
      role: ['section'],
      position: 'fallback',
      filter: (data): data is { subject: Obj.Any } => Obj.isObject(data.subject),
      component: ({ data }) => {
        return (
          <div role='none' className='flex is-full justify-center'>
            <div role='none' className='pbs-2 pbe-2 card-min-width card-max-width'>
              <Surface role='card' data={data} limit={1} />
            </div>
          </div>
        );
      },
    }),
  ]);
