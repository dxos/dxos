//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capability, Common } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type ProjectionModel } from '@dxos/schema';
import { Organization, Person, Project, Task } from '@dxos/types';

import { FormCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../../cards';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Common.Capability.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      Common.createSurface<{ subject: Person.Person }>({
        id: `${meta.id}/schema-popover--contact`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
        component: ({ data, role }) => {
          return <PersonCard role={role} subject={data.subject} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/schema-popover--organization`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Organization.Organization } =>
          Obj.instanceOf(Organization.Organization, data.subject),
        component: ({ data, role }) => {
          return <OrganizationCard role={role} subject={data.subject} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/schema-popover--project`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Project.Project } => Obj.instanceOf(Project.Project, data.subject),
        component: ({ data, role }) => {
          return <ProjectCard role={role} subject={data.subject} />;
        },
      }),
      Common.createSurface({
        id: `${meta.id}/schema-popover--task`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Task.Task } => Obj.instanceOf(Task.Task, data.subject),
        component: ({ data, role }) => {
          return <TaskCard role={role} subject={data.subject} />;
        },
      }),

      //
      // Fallback for any object.
      //

      Common.createSurface({
        id: `${meta.id}/fallback-popover`,
        role: 'card--content',
        position: 'fallback',
        filter: (data): data is { subject: Obj.Any; projection?: ProjectionModel } => Obj.isObject(data.subject),
        component: ({ data, role }) => {
          return <FormCard role={role} subject={data.subject} projection={data.projection} />;
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
