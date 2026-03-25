//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, JsonSchema, Obj, Ref, Type } from '@dxos/echo';

import { Blueprint } from '../blueprint';
import * as Template from '../template';

/**
 * Executable instructions, which may use Blueprints.
 * May reference additional context.
 */
export const Prompt = Schema.Struct({
  /**
   * Name of the prompt.
   */
  name: Schema.optional(Schema.String),

  /**
   * Description of the prompt's purpose and functionality.
   * Allows AI agents to execute prompts automatically as tools.
   */
  description: Schema.optional(Schema.String),

  /**
   * Input schema of the prompt.
   */
  input: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Output schema of the prompt.
   */
  output: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Natural language instructions for the prompt.
   * These should provide concrete course of action for the AI to follow.
   */
  instructions: Template.Template.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Blueprints that the prompt may utilize.
   */
  blueprints: Schema.Array(Ref.Ref(Blueprint)),

  /**
   * Additional context that the prompt may utilize.
   */
  context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Sub-prompts that can be invoked as tools by this prompt.
   */
  prompts: Schema.optional(
    Schema.Array(Schema.suspend((): Ref.RefSchema<Prompt> => Ref.Ref(Prompt))).pipe(
      Annotation.FormInputAnnotation.set(false),
    ),
  ),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.prompt',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--scroll--regular',
    hue: 'sky',
  }),
);

export interface Prompt extends Schema.Schema.Type<typeof Prompt> {}

export const make = (params: {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  instructions?: string;
  blueprints?: Ref.Ref<Blueprint>[];
  context?: any[];
  prompts?: Ref.Ref<Prompt>[];
}): Prompt =>
  Obj.make(Prompt, {
    name: params.name,
    description: params.description,
    input: JsonSchema.toJsonSchema(params.input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(params.output ?? Schema.Void),
    instructions: Template.make({ source: params.instructions }),
    blueprints: params.blueprints ?? [],
    context: params.context ?? [],
    prompts: params.prompts,
  });
