//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui-mosaic';
import { type ProjectionModel } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

import { FormCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../../cards';
import { meta } from '../../meta';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      Surface.create<{ subject: Person.Person }>({
        id: `${meta.id}/schema-popover--contact`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Person.Person } => Obj.instanceOf(Person.Person, data.subject),
        component: ({ data, role }) => {
          return <PersonCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/schema-popover--organization`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Organization.Organization } =>
          Obj.instanceOf(Organization.Organization, data.subject),
        component: ({ data, role }) => {
          return <OrganizationCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/schema-popover--project`,
        role: 'card--content',
        position: 'hoist',
        filter: (data): data is { subject: Pipeline.Pipeline } => Obj.instanceOf(Pipeline.Pipeline, data.subject),
        component: ({ data, role }) => {
          return <ProjectCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create({
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

      Surface.create({
        id: `${meta.id}/fallback-popover`,
        role: 'card--content',
        position: 'fallback',
        filter: (data): data is { subject: Obj.Unknown; projection?: ProjectionModel } => Obj.isObject(data.subject),
        component: ({ data, role }) => {
          return <FormCard role={role} subject={data.subject} projection={data.projection} />;
        },
      }),

      Surface.create({
        id: `${meta.id}/section`,
        role: ['section'],
        position: 'fallback',
        filter: (data): data is { subject: Obj.Unknown } => Obj.isObject(data.subject),
        component: ({ data }) => {
          return (
            <div role='none' className='flex w-full justify-center'>
              <div role='none' className='pt-2 pb-2 card-min-width card-max-width'>
                <Card.Root>
                  <Surface.Surface role='card--content' data={data} limit={1} />
                </Card.Root>
              </div>
            </div>
          );
        },
      }),
    ]),
  ),
);
