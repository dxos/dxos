//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, JsonSchema, Obj, Ref, Type, Format } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Blueprint from './Blueprint';

/**
 * Prompt-based operation.
 * May reference blueprints and additional context.
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
    Format.FormatAnnotation.set(Format.TypeFormat.Markdown),
    Schema.annotations({ description: 'Describe what the agent should do in each session.' }),
  ),
  blueprints: Schema.Array(Ref.Ref(Blueprint.Blueprint)),
  /**
   * Context objects bound to the agent's session when this routine runs (sibling of `blueprints`).
   * Generic `Ref.Ref(Obj.Unknown)` so any space object qualifies. Honored on every run path that
   * executes a routine through the agent prompt, not only triggered automations.
   */
  objects: Schema.Array(Ref.Ref(Obj.Unknown)).pipe(Schema.annotations({ title: 'Objects' }), Schema.optional),
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
  blueprints?: Ref.Ref<Blueprint.Blueprint>[];
  objects?: Ref.Ref<Obj.Unknown>[];
};

export const make = ({
  name,
  description,
  input,
  output,
  instructions,
  blueprints = [],
  objects,
}: MakeProps): Routine =>
  Obj.make(Routine, {
    name,
    description,
    input: JsonSchema.toJsonSchema(input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(output ?? Schema.Void),
    instructions: Ref.make(Text.make({ content: instructions ?? '' })),
    blueprints,
    objects,
  });
