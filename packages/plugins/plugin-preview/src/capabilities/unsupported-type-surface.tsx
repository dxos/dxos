//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { Obj, Type } from '@dxos/echo';
import { Position } from '@dxos/util';

import { UnsupportedType } from '../components';

/**
 * True when no enabled plugin owns the object's type, read off the type registry.
 *
 * Deliberately NOT read off "no other article candidate matched": surface modules are role-gated, so
 * they load only once an article is first requested — for the frames before a real plugin's surface
 * arrives, the absence of a candidate is also true, and this stand-in would flash on the first plank
 * a session opens. Plugins register their schema in the boot idle wave instead, long before a user
 * opens anything, so the registry answers the question without racing.
 */
const isUnclaimedType = (subject: unknown): subject is Obj.Unknown => {
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

/**
 * Last article candidate, and the plank takes `limit={1}` — so this renders only when nothing else
 * claims the object. A curated plugin set shares a backend with the full-catalog build, so an object
 * created there can arrive with no plugin that renders it; an empty plank would read as data loss.
 *
 * Its own module rather than a member of `react-surface.ts`: role gating means declaring
 * `org.dxos.role.article` there would load the card surfaces (forms, JSON highlighter) on the first
 * article render anywhere. This module is one component.
 */
export default Capability.makeModule(() =>
  Effect.succeed(
    Capability.contribute(Capabilities.ReactSurface, [
      Surface.create({
        id: 'unsupportedTypeArticle',
        position: Position.last,
        filter: AppSurface.subject(AppSurface.Article, isUnclaimedType),
        component: UnsupportedType,
        props: ({ role, data: { subject } }) => ({ role, typename: Obj.getTypename(subject) ?? '' }),
      }),
    ]),
  ),
);
