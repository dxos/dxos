//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as Project from '@dxos/compute/Project';
import * as Spec from '@dxos/compute/Spec';
import { Obj, Relation, Type } from '@dxos/echo';
import { getRangeFromCursor, getTextInAnchorRange } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import { type AnchoredTo } from '@dxos/types';

import { ProjectOperation } from '#types';

import { ProjectsNamespace } from '../namespace.ts';
import * as FieldAnchor from '../util/field-anchor.ts';

const projectType = Type.getTypename(Project.Project);
const specType = Type.getTypename(Spec.Spec);

/** Whether the object takes comments here: a project, or a spec. */
const isSubject = (object: unknown): object is Project.Project | Spec.Spec =>
  Obj.instanceOf(Project.Project, object) || Spec.instanceOf(object);

/** The accessor of a spec's text, when it is loaded. */
const textOf = (spec: Spec.Spec) => {
  const text = spec.content.peek();
  return text && Doc.createAccessor(text, ['content']);
};

/**
 * Where an anchor reads in its object: whole-object threads first, then by field, then (in a spec) by position in its
 * text, after the fields; an anchor that no longer resolves last.
 */
const getPosition = (object: Project.Project | Spec.Spec, anchor?: string): [order: number, start: number] => {
  if (!anchor) {
    return [-1, 0];
  }
  const field = FieldAnchor.getPosition(object, anchor);
  if (field) {
    return field;
  }
  const accessor = Spec.instanceOf(object) ? textOf(object) : undefined;
  try {
    const range = accessor && getRangeFromCursor(accessor, anchor);
    return range ? [2, range.start] : [Number.MAX_SAFE_INTEGER, 0];
  } catch {
    return [Number.MAX_SAFE_INTEGER, 0];
  }
};

/** The text an anchor spans: in a field of the object, else in a spec's text. */
const getText = (object: Project.Project | Spec.Spec, anchor: string): string | undefined => {
  if (FieldAnchor.resolve(anchor)) {
    return FieldAnchor.getText(object, anchor);
  }
  const accessor = Spec.instanceOf(object) ? textOf(object) : undefined;
  return accessor && getTextInAnchorRange(accessor, anchor);
};

/**
 * Comments on projects and their specs, anchored into a project's or a spec's name and description and into a spec's
 * text. A project's comments companion lists the threads on the project and on each of its specs.
 */
export default Capability.makeModule(() =>
  Effect.succeed([
    ...[projectType, specType].flatMap((key) => [
      Capability.contribute(AppCapabilities.CommentConfig, {
        id: key,
        comments: 'anchored',
        scrollToAnchor: ProjectOperation.ScrollToAnchor,
        // Anchors are field paths the field editors write, never a selection on a map or list.
        anchorFromSelection: () => undefined,
      }),
      Capability.contribute(AppCapabilities.AnchorSort, {
        key,
        sort: (anchorA: AnchoredTo.AnchoredTo, anchorB: AnchoredTo.AnchoredTo) => {
          const object = Relation.getTarget(anchorA);
          if (!isSubject(object) || object !== Relation.getTarget(anchorB)) {
            return 0;
          }
          const [orderA, startA] = getPosition(object, anchorA.anchor);
          const [orderB, startB] = getPosition(object, anchorB.anchor);
          return orderA - orderB || startA - startB;
        },
      }),
      Capability.contribute(AppCapabilities.AnchorResolver, {
        key,
        getText: (object: Project.Project | Spec.Spec, anchor: string) => getText(object, anchor),
      }),
    ]),
    // Plugins that draw a spec's contents, such as its features, add their own objects through scopes of their own.
    Capability.contribute(AppCapabilities.CommentScope, {
      id: `${ProjectsNamespace.key}.project`,
      resolve: (data, get) => {
        if (!Obj.instanceOf(Project.Project, data)) {
          return undefined;
        }
        const { specs } = get(Obj.atom(data));
        const loaded: (Obj.Unknown | undefined)[] = get(Obj.atomReactive(specs));
        return { subject: data, targets: [data, ...loaded.filter(Obj.isObject)] };
      },
    }),
  ]),
);
