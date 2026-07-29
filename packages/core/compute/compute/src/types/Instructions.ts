//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, DXN, Format, JsonSchema, Obj, Ref, Type } from '@dxos/echo';
import { Text } from '@dxos/schema';

import * as Skill from './Skill';

/** A sentinel command the model recognizes in chat (e.g. `$track <text>`). */
export const Command = Schema.Struct({
  sentinel: Schema.String.annotations({ description: 'Token that invokes the command (e.g. "$track").' }),
  description: Schema.optional(Schema.String),
  prompt: Schema.String.annotations({ description: 'What the model should do when the sentinel appears.' }),
});
export type Command = Schema.Schema.Type<typeof Command>;

/**
 * Prompt-based operation.
 * May reference skills and additional context.
 * Hidden from the navtree and object picker — accessed only through Routines.
 */
export class Instructions extends Type.makeObject<Instructions>(DXN.make('org.dxos.type.instructions', '0.1.0'))(
  Schema.Struct({
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
    /** Sentinel commands available to chat sessions running with these instructions. */
    commands: Schema.Array(Command).pipe(Schema.annotations({ title: 'Commands' }), Schema.optional),
  }).pipe(
    Annotation.LabelAnnotation.set(['name']),
    Annotation.IconAnnotation.set({ icon: 'ph--scroll--regular', hue: 'sky' }),
    Annotation.HiddenAnnotation.set(true),
  ),
) {}

export type MakeProps = {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  text?: string;
  skills?: Ref.Ref<Skill.Skill>[];
  objects?: Ref.Ref<Obj.Unknown>[];
  commands?: Command[];
};

/** Creates an Instructions object with an owned Markdown `text` body (parented so it cascades and deep-clones). */
export const make = ({
  name,
  description,
  input,
  output,
  text,
  skills = [],
  objects,
  commands,
}: MakeProps): Instructions => {
  const body = Text.make({ content: text ?? '' });
  const instructions = Obj.make(Instructions, {
    name,
    description,
    input: JsonSchema.toJsonSchema(input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(output ?? Schema.Void),
    text: Ref.make(body),
    skills,
    objects,
    commands,
  });
  // The body is owned by the instructions: it cascade-deletes with it and is cloned alongside it under
  // `Obj.clone(..., { deep: 'parent' })`.
  Obj.setParent(body, instructions);
  return instructions;
};
