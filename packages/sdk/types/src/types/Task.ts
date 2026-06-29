//
// Copyright 2023 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, Obj, Ref, Type } from '@dxos/echo';
// eslint-disable-next-line unused-imports/no-unused-imports
import { View as _View } from '@dxos/echo';
import { GeneratorAnnotation, LabelAnnotation } from '@dxos/echo/Annotation';
import { FormatAnnotation } from '@dxos/echo/Format';
import { PropertyMetaAnnotationId } from '@dxos/echo/internal';

import * as Person from './Person';
import * as Project from './Project';

export class Task extends Type.makeObject<Task>(DXN.make('org.dxos.type.task', '0.1.0'))(
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
    status: Schema.Literal('todo', 'in-progress', 'done').pipe(
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
            ],
          },
        },
      }),
      Schema.optional,
    ),
    assigned: Schema.optional(Ref.Ref(Person.Person).annotations({ title: 'Assigned' })),
    estimate: Schema.optional(Schema.Number.annotations({ title: 'Estimate' })),
    description: Schema.optional(
      Schema.String.annotations({ title: 'Description' }).pipe(
        GeneratorAnnotation.set({
          generator: 'lorem.paragraphs',
          args: [{ min: 1, max: 3 }],
        }),
      ),
    ),
    project: Schema.optional(Ref.Ref(Project.Project).annotations({ title: 'Project' })),
    // TODO(burdon): Created date metadata.
    // due: Date,
    // TODO(burdon): Generic tags.
    // tags: [String],
  }).pipe(
    LabelAnnotation.set(['title']),
    Annotation.IconAnnotation.set({ icon: 'ph--check-circle--regular', hue: 'neutral' }),
  ),
) {}

export const make = (props: Obj.MakeProps<typeof Task>): Task => Obj.make(Task, props);
