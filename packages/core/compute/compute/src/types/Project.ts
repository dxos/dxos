//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, Collection, DXN, Obj, Ref, Type } from '@dxos/echo';
import { FormInlineAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';

import * as Instructions from './Instructions';
import * as Routine from './Routine';

/**
 * A user-facing container for interactive, long-running work: instructions (skills + commands),
 * routines, artifacts, and AI chat sessions in project context. Successor to `Topic`.
 * Chats and agents attach via relations/queries (assistant-toolkit depends on compute, so no typed refs here).
 */
export class Project extends Type.makeObject<Project>(DXN.make('org.dxos.type.project', '0.2.0'))(
  Schema.Struct({
    name: Schema.optional(Schema.String),
    description: Schema.optional(Schema.String),

    /** Owned agent instructions (created + parented at the plugin layer). */
    instructions: Ref.Ref(Instructions.Instructions).pipe(FormInlineAnnotation.set(true), Schema.optional),

    /** Routines created within the scope of this project. */
    routines: Schema.Array(Ref.Ref(Routine.Routine)),

    /** Owned collection of artifacts (documents, outliners, tables, ...) managed by the project. */
    artifacts: Ref.Ref(Collection.Collection).pipe(Schema.optional),
  }).pipe(
    Schema.annotations({ title: 'Project' }),
    LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--stack--regular', hue: 'rose' }),
  ),
) {}

/** Factory wrapper around `Obj.make` for {@link Project}. */
export const make = (
  props: Omit<Partial<Obj.MakeProps<typeof Project>>, 'routines'> & {
    routines?: ReadonlyArray<Ref.Ref<Routine.Routine>>;
  } = {},
): Project => Obj.make(Project, { routines: [], ...props });
