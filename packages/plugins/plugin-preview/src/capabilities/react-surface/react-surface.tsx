//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Surface, SurfaceCardRole, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { useActiveSpace } from '@dxos/plugin-space';
import { type ProjectionModel } from '@dxos/schema';
import { Organization, Person, Project, Task } from '@dxos/types';

import { FormCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../../cards';
import { meta } from '../../meta';
import { type CardPreviewProps } from '../../types';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      // TODO(burdon): Infer Role type.
      Common.createSurface<{ subject: Person.Person }>({
        id: `${meta.id}/schema-popover--contact`,
        role: SurfaceCardRole.literals as any,
        filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
        component: ({ data, role }) => {
          const { invokePromise } = useOperationInvoker();
          const db = Obj.getDatabase(data.subject);
          const activeSpace = useActiveSpace(); // TODO(burdon): Disambiguate with space?
          const handleSelect = useCallback<NonNullable<CardPreviewProps['onSelect']>>(
            (object) =>
              invokePromise(Common.LayoutOperation.Open, {
                subject: [Obj.getDXN(object).toString()],
                workspace: db?.spaceId,
              }),
            [invokePromise],
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
      Common.createSurface({
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
      Common.createSurface({
        id: `${meta.id}/schema-popover--project`,
        role: SurfaceCardRole.literals as any,
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data, role }) => {
          const activeSpace = useActiveSpace();
          return <ProjectCard subject={data.subject} role={role as SurfaceCardRole} db={activeSpace?.db} />;
        },
      }),
      Common.createSurface({
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

      Common.createSurface({
        id: `${meta.id}/fallback-popover`,
        role: SurfaceCardRole.literals as any,
        position: 'fallback',
        filter: (data): data is { subject: Obj.Any; projection?: ProjectionModel } => Obj.isObject(data.subject),
        component: ({ data, role }) => {
          return <FormCard subject={data.subject} projection={data.projection} role={role as SurfaceCardRole} />;
        },
      }),

      Common.createSurface({
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
    ]),
  ),
);
