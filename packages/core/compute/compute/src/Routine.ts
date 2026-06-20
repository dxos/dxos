//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, JsonSchema, Obj, Ref, Type, Format } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Skill from './Skill';

/**
 * Prompt-based operation.
 * May reference skills and additional context.
 */
export const Routine = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  input: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
    description: 'Input schema',
  }),
  output: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
    description: 'Output schema',
  }),
  instructions: Ref.Ref(Text.Text).pipe(
    Annotation.FormInputAnnotation.set(false),
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'Instructions', description: 'Agent instructions' }),
  ),
  skills: Schema.Array(Ref.Ref(Skill.Skill)),
  context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--scroll--regular', hue: 'sky' }),
  Type.makeObject(DXN.make('org.dxos.type.routine', '0.1.0')),
);

export type Routine = Type.InstanceType<typeof Routine>;

export type MakeProps = {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  instructions?: string;
  skills?: Ref.Ref<Skill.Skill>[];
  context?: any[];
};

export const make = ({
  name,
  description,
  input,
  output,
  instructions,
  skills = [],
  context = [],
}: MakeProps): Routine =>
  Obj.make(Routine, {
    name,
    description,
    input: JsonSchema.toJsonSchema(input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(output ?? Schema.Void),
    instructions: Ref.make(Text.make({ content: instructions ?? '' })),
    skills,
    context,
  });
