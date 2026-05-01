//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { type ProjectionModel } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

import { FormCard, JsonCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      Surface.create<{ subject: Person.Person }>({
        id: 'schema-popover--contact',
        position: 'hoist',
        filter: AppSurface.object(AppSurface.Card, Person.Person),
        component: ({ data, role }) => {
          return (
            <>
              <PersonCard role={role} subject={data.subject} />
              <Surface.Surface type={AppSurface.Related} data={data} limit={1} />
            </>
          );
        },
      }),
      Surface.create({
        id: 'schema-popover--organization',
        position: 'hoist',
        filter: AppSurface.object(AppSurface.Card, Organization.Organization),
        component: ({ data, role }) => {
          return (
            <>
              <OrganizationCard role={role} subject={data.subject} />
              <Surface.Surface type={AppSurface.Related} data={data} limit={1} />
            </>
          );
        },
      }),
      Surface.create({
        id: 'schema-popover--project',
        position: 'hoist',
        filter: AppSurface.object(AppSurface.Card, Pipeline.Pipeline),
        component: ({ data, role }) => {
          return <ProjectCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create({
        id: 'schema-popover--task',
        position: 'hoist',
        filter: AppSurface.object(AppSurface.Card, Task.Task),
        component: ({ data, role }) => {
          return <TaskCard role={role} subject={data.subject} />;
        },
      }),

      //
      // Fallback for any object.
      //

      Surface.create({
        id: 'fallback-popover',
        role: 'card--content',
        position: 'fallback',
        filter: (data): data is { subject: Obj.Unknown; projection?: ProjectionModel } => Obj.isObject(data.subject),
        component: ({ data, role }) => {
          return <FormCard role={role} subject={data.subject} projection={data.projection} />;
        },
      }),

      Surface.create({
        id: 'fallback-json',
        role: 'card--content',
        position: 'fallback',
        filter: (data): data is Record<string, unknown> => true,
        component: ({ data }) => {
          return <JsonCard data={data} />;
        },
      }),

      Surface.create({
        id: 'section',
        position: 'fallback',
        filter: AppSurface.subject(AppSurface.Section, Obj.isObject),
        component: ({ data }) => {
          return (
            <div role='none' className='flex w-full justify-center'>
              <div role='none' className='py-2 dx-card-min-width dx-card-max-width'>
                <Card.Root>
                  <Surface.Surface type={AppSurface.Card} data={data} limit={1} />
                </Card.Root>
              </div>
            </div>
          );
        },
      }),
    ]),
  ),
);
