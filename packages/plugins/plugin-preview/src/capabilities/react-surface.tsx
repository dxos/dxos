//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { Card } from '@dxos/react-ui';
import { Expando } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';

import { ExpandoCard, FormCard, JsonCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      Surface.create<{ subject: Person.Person }>({
        id: 'schemaPopoverContact',
        position: 'first',
        filter: AppSurface.object(AppSurface.CardContent, Person.Person),
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
        id: 'schemaPopoverOrganization',
        position: 'first',
        filter: AppSurface.object(AppSurface.CardContent, Organization.Organization),
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
        id: 'schemaPopoverProject',
        position: 'first',
        filter: AppSurface.object(AppSurface.CardContent, Pipeline.Pipeline),
        component: ({ data, role }) => {
          return <ProjectCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create({
        id: 'schemaPopoverTask',
        position: 'first',
        filter: AppSurface.object(AppSurface.CardContent, Task.Task),
        component: ({ data, role }) => {
          return <TaskCard role={role} subject={data.subject} />;
        },
      }),
      Surface.create<AppSurface.ObjectCardData<Expando.Expando>>({
        id: 'schemaPopoverExpando',
        filter: AppSurface.object(AppSurface.CardContent, Expando.Expando),
        component: ({ data, role }) => {
          return <ExpandoCard role={role} subject={data.subject} ignorePaths={data.ignorePaths} />;
        },
      }),

      Surface.create({
        id: 'schemaPopoverDynamicType',
        filter: AppSurface.subject(AppSurface.CardContent, (subject): subject is Obj.Unknown => {
          if (!Obj.isObject(subject)) {
            return false;
          }
          const type = Obj.getType(subject);
          if (type) {
            return Type.getDatabase(type) != null;
          }
          // Obj.getType fails for database-registered schemas (DXN mismatch); fall back to typename query.
          try {
            const db = Obj.getDatabase(subject);
            const typename = Obj.getTypename(subject);
            return (
              !!db &&
              !!typename &&
              db.graph.registry
                .list()
                .filter(Type.isType)
                .some((t) => Type.getTypename(t) === typename)
            );
          } catch {
            return false;
          }
        }),
        component: ({ data, role }) => {
          // Dynamic/mutable schemas render an editable, full-layout form;
          // FormCard handles both static and runtime schema resolution internally.
          return <FormCard role={role} subject={data.subject} readonly={false} layout='full' />;
        },
      }),

      //
      // Fallback for any object.
      //

      Surface.create({
        id: 'fallbackPopover',
        position: 'last',
        filter: AppSurface.subject(AppSurface.CardContent, Obj.isObject),
        component: ({ data, role }) => {
          return <FormCard role={role} subject={data.subject} projection={data.projection} />;
        },
      }),

      Surface.create({
        id: 'fallbackJson',
        filter: Surface.makeFilter(AppSurface.CardContent),
        position: 'last',
        component: ({ data }) => {
          return <JsonCard data={data} />;
        },
      }),

      Surface.create({
        id: 'section',
        position: 'last',
        filter: AppSurface.subject(AppSurface.Section, Obj.isObject),
        component: ({ data }) => {
          return (
            <div className='flex w-full justify-center'>
              <div className='py-2 dx-card-min-width dx-card-max-width'>
                <Card.Root>
                  <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
                </Card.Root>
              </div>
            </div>
          );
        },
      }),
    ]),
  ),
);
