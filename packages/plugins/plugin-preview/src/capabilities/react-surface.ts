//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { Expando } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';
import { Position } from '@dxos/util';

import { ExpandoCard, FormCard, JsonCard, ProjectCard, TaskCard } from '../cards';
import { OrganizationCardContent, PersonCardContent } from './RelatedCards';

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contributes(Capabilities.ReactSurface, [
      //
      // Specific schema types.
      // TODO(burdon): Create helpers and factor out.
      //

      Surface.create({
        id: 'organizationContent',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Organization.Organization),
        component: OrganizationCardContent,
        props: ({ role, data }) => ({ role, ...data }),
      }),
      Surface.create({
        id: 'contactContent',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Person.Person),
        component: PersonCardContent,
        props: ({ role, data }) => ({ role, ...data }),
      }),

      Surface.create({
        id: 'schemaPopoverProject',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Pipeline.Pipeline),
        component: ProjectCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'schemaPopoverTask',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardContent, Task.Task),
        component: TaskCard,
        props: ({ role, data: { subject } }) => ({ role, subject }),
      }),
      Surface.create({
        id: 'schemaPopoverExpando',
        filter: AppSurface.object(AppSurface.CardContent, Expando.Expando),
        component: ExpandoCard,
        props: ({ role, data: { subject, ignorePaths } }) => ({ role, subject, ignorePaths }),
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
        // Dynamic/mutable schemas render an editable, full-layout form;
        // FormCard handles both static and runtime schema resolution internally.
        component: FormCard,
        props: ({ role, data: { subject } }) => ({ role, subject, readonly: false, layout: 'full' as const }),
      }),

      //
      // Fallback for any object.
      //

      Surface.create({
        id: 'fallbackPopover',
        position: Position.last,
        filter: AppSurface.subject(AppSurface.CardContent, Obj.isObject),
        component: FormCard,
        props: ({ role, data: { subject, projection } }) => ({ role, subject, projection }),
      }),

      Surface.create({
        id: 'fallbackJson',
        filter: Surface.makeFilter(AppSurface.CardContent),
        position: Position.last,
        component: JsonCard,
        props: ({ data }) => ({ data }),
      }),

      // Surface.create({
      //   id: 'fallbackSection',
      //   position: Position.last,
      //   filter: AppSurface.subject(AppSurface.Section, Obj.isObject),
      //   component: ({ data }) => {
      //     return (
      //       <div className='flex w-full justify-center'>
      //         <div className='py-2 dx-card-min-width dx-card-max-width'>
      //           <Card.Root>
      //             <Surface.Surface type={AppSurface.CardContent} data={data} limit={1} />
      //           </Card.Root>
      //         </div>
      //       </div>
      //     );
      //   },
      // }),
    ]),
  ),
);
