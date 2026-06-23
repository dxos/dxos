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
 * Hidden from the navtree and object picker — accessed only through Routines.
 */
export const Instructions = Schema.Struct({
  name: Schema.optional(Schema.String),
  description: Schema.optional(Schema.String),
  input: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
    description: 'Input schema',
  }),
  output: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
    description: 'Output schema',
  }),
  text: Ref.Ref(Text.Text).pipe(
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ title: 'Instructions', description: 'Describe what the agent should do in each session.' }),
  ),
  skills: Schema.Array(Ref.Ref(Skill.Skill)),
  /**
   * Context objects bound to the agent's session when this routine runs (sibling of `skills`).
   * Generic `Ref.Ref(Obj.Unknown)` so any space object qualifies. Honored on every run path that
   * executes a routine through the agent prompt, not only triggered automations.
   */
  objects: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Schema.annotations({ title: 'Objects' }), Schema.optional),
}).pipe(
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({ icon: 'ph--scroll--regular', hue: 'sky' }),
  Annotation.HiddenAnnotation.set(true),
  Type.makeObject(DXN.make('org.dxos.type.instructions', '0.1.0')),
);

export type Instructions = Type.InstanceType<typeof Instructions>;

export type MakeProps = {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  text?: string;
  skills?: Ref.Ref<Skill.Skill>[];
  objects?: Ref.Ref<Obj.Unknown>[];
};

export const make = ({ name, description, input, output, text, skills = [], objects }: MakeProps): Instructions =>
  Obj.make(Instructions, {
    name,
    description,
    input: JsonSchema.toJsonSchema(input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(output ?? Schema.Void),
    text: Ref.make(Text.make({ content: text ?? '' })),
    skills,
    objects,
  });
