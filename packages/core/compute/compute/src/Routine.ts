//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, Obj, Ref, Type, Format } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Blueprint from './Blueprint';

/**
 * Prompt-based operation.
 * May reference blueprints and additional context.
 */
export const Routine = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  instructions: Ref.Ref(Text.Text).pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Describe what the agent should do in each session.' }),
  ),
  blueprints: Schema.Array(Ref.Ref(Blueprint.Blueprint)),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--scroll--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.routine', '0.1.0')),
);

export type Routine = Type.InstanceType<typeof Routine>;

export type MakeProps = {
  name?: string;
  description?: string;
  instructions?: string;
  blueprints?: Ref.Ref<Blueprint.Blueprint>[];
};

export const make = ({ name, description, instructions, blueprints = [] }: MakeProps): Routine =>
  Obj.make(Routine, {
    name,
    description,
    instructions: Ref.make(Text.make({ content: instructions ?? '' })),
    blueprints,
  });
