//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

import * as Actor from './Actor';
import * as Milestone from './Milestone';

export const Priority = Schema.Literals(['none', 'low', 'medium', 'high', 'urgent']);
export type Priority = Schema.Schema.Type<typeof Priority>;

// `failed`/`cancelled` exist so delegated agent tasks and human tasks share one status vocabulary.
export const Status = Schema.Literals(['todo', 'started', 'done', 'cancelled', 'failed']);
export type Status = Schema.Schema.Type<typeof Status>;

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.3.0'))(
  Schema.Struct({
    title: Schema.String.pipe(
      Schema.annotate({ title: 'Title' }),
      GeneratorAnnotation.set({
        generator: 'lorem.words',
        args: [{ min: 3, max: 10 }],
      }),
    ),
    priority: Priority.pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [Priority.literals],
      }),
      Schema.annotate({
        title: 'Priority',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'none', title: 'None', color: 'gray' },
              { id: 'low', title: 'Low', color: 'indigo' },
              { id: 'medium', title: 'Medium', color: 'purple' },
              { id: 'high', title: 'High', color: 'amber' },
              { id: 'urgent', title: 'Urgent', color: 'red' },
            ],
          },
        },
      }),
      Schema.optional,
    ),
    status: Status.pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [['todo', 'started', 'done']],
      }),
      Schema.annotate({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'todo', title: 'Todo', color: 'indigo' },
              { id: 'started', title: 'Started', color: 'purple' },
              { id: 'done', title: 'Done', color: 'amber' },
              { id: 'cancelled', title: 'Cancelled', color: 'gray' },
              { id: 'failed', title: 'Failed', color: 'red' },
            ],
          },
        },
      }),
      Schema.optional,
    ),
    /** Human or agent assignment: a HALO identity (DID), a Person ref, a bare email, or a display name. */
    assignee: Schema.optional(Actor.Actor.annotate({ title: 'Assignee' })),
    estimate: Schema.optional(Schema.Number.annotate({ title: 'Estimate' })),
    description: Schema.optional(
      Schema.String.annotate({ title: 'Description' }).pipe(
        GeneratorAnnotation.set({
          generator: 'lorem.paragraphs',
          args: [{ min: 1, max: 3 }],
        }),
      ),
    ),
    /**
     * The milestone this task belongs to; unset means backlog. A sub-task inherits its nearest
     * ancestor's milestone at read time unless it sets its own (matching Linear).
     */
    milestone: Schema.optional(Ref.Ref(Milestone.Milestone).annotate({ title: 'Milestone' })),

    /**
     * Parent in the sub-task hierarchy (unbounded depth); unset means a root task. Named
     * `parentTask` because the ECHO parent edge is a different, lifecycle-only concept — it is
     * set alongside for deletion cascade and is not the queryable hierarchy.
     */
    // `Schema.suspend` because the type refers to itself; clear the field with `delete` rather
    // than an `undefined` assignment, which the suspended schema rejects on validation.
    parentTask: Schema.optional(
      Schema.suspend((): Ref.RefSchema<Task> => Ref.Ref(Task).annotate({ title: 'Parent Task' })),
    ),

    // Set membership is the `TaskSet.tasks` array (flat, ordered, sub-tasks included), not a
    // backref here: enumeration stays one array read and a move stays one field write.
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-circle--regular', hue: 'neutral' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Task>): Task => Obj.make(Task, props);
