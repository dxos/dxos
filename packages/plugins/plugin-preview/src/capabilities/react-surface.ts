//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { Expando } from '@dxos/schema';
import { Organization, Person, Pipeline, Task } from '@dxos/types';
import { Position } from '@dxos/util';

import { ExpandoCard, FormCard, JsonCard, PersonCardIcon, ProjectCard, TaskCard } from '../cards/index.ts';
import { UnsupportedType } from '../components/index.ts';
import { OrganizationCardContent, PersonCardContent } from './RelatedCards.tsx';

/**
 * Checked against the type registry rather than "no other candidate matched" — the latter is also
 * true while a real plugin's surface is still loading, which would flash this stand-in on every
 * session's first plank.
 */
const isTypeUnavailable = (subject: unknown): subject is Obj.Unknown => {
  if (!Obj.isObject(subject)) {
    return false;
  }
  const typename = Obj.getTypename(subject);
  if (!typename) {
    return false;
  }
  try {
    const db = Obj.getDatabase(subject);
    return (
      !!db &&
      !db.graph.registry
        .list()
        .filter(Type.isType)
        .some((type) => Type.getTypename(type) === typename)
    );
  } catch {
    // Not attached to a database (a story, a detached object) — nothing to conclude, so stay out.
    return false;
  }
};

export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
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
      // A person's card leads with their face, not the generic person glyph. Contributed only for
      // `Person`; every other type keeps its host's default depiction.
      Surface.create({
        id: 'contactIcon',
        position: Position.first,
        filter: AppSurface.object(AppSurface.CardIcon, Person.Person),
        component: PersonCardIcon,
        props: ({ data: { subject } }) => ({ subject }),
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

      // Last-resort candidate (plank `limit={1}`) for an object whose plugin is absent — e.g. one
      // created in a build that shares a backend with a full-catalog build.
      Surface.create({
        id: 'unsupportedTypeArticle',
        position: Position.last,
        filter: AppSurface.subject(AppSurface.Article, isTypeUnavailable),
        component: UnsupportedType,
        props: ({ role, data: { subject } }) => ({ role, typename: Obj.getTypename(subject) ?? '' }),
      }),
    ]),
  ),
);
