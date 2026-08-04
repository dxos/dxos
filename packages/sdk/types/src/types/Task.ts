//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Type } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

import * as Actor from './Actor';

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.2.0'))(
  Schema.Struct({
    title: Schema.String.pipe(
      Schema.annotations({ title: 'Title' }),
      GeneratorAnnotation.set({
        generator: 'lorem.words',
        args: [{ min: 3, max: 10 }],
      }),
    ),
    priority: Schema.Literal('none', 'low', 'medium', 'high', 'urgent').pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [['none', 'low', 'medium', 'high', 'urgent']],
      }),
      Schema.annotations({
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
    // `failed`/`cancelled` exist so delegated agent tasks and human tasks share one status vocabulary.
    status: Schema.Literal('todo', 'in-progress', 'done', 'failed', 'cancelled').pipe(
      FormatAnnotation.set(Format.TypeFormat.SingleSelect),
      GeneratorAnnotation.set({
        generator: 'helpers.arrayElement',
        args: [['todo', 'in-progress', 'done']],
      }),
      Schema.annotations({
        title: 'Status',
        [PropertyMetaAnnotationId]: {
          singleSelect: {
            options: [
              { id: 'todo', title: 'Todo', color: 'indigo' },
              { id: 'in-progress', title: 'In Progress', color: 'purple' },
              { id: 'done', title: 'Done', color: 'amber' },
              { id: 'failed', title: 'Failed', color: 'red' },
              { id: 'cancelled', title: 'Cancelled', color: 'gray' },
            ],
          },
        },
      }),
      Schema.optional,
    ),
    /** Human or agent assignment: a HALO identity (DID), a Person ref, a bare email, or a display name. */
    assignee: Schema.optional(Actor.Actor.annotations({ title: 'Assignee' })),
    estimate: Schema.optional(Schema.Number.annotations({ title: 'Estimate' })),
    description: Schema.optional(
      Schema.String.annotations({ title: 'Description' }).pipe(
        GeneratorAnnotation.set({
          generator: 'lorem.paragraphs',
          args: [{ min: 1, max: 3 }],
        }),
      ),
    ),
    // Containment is the ECHO parent edge, not a field: a TaskSet parents its root tasks and a
    // task parents its sub-tasks (one tree; a sub-task's set membership is transitive).
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-circle--regular', hue: 'neutral' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Task>): Task => Obj.make(Task, props);
