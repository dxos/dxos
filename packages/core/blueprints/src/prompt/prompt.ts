//
// Copyright 2025 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Annotation, JsonSchema, Obj, type Ref, Type } from '@dxos/echo';

import { Blueprint } from '../blueprint';
import * as Template from '../template';

/**
 * Executable instructions, which may use Blueprints.
 * May reference additional context.
 */
const Prompt_ = Schema.Struct({
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
  blueprints: Schema.Array(Type.Ref(Blueprint)),

  /**
   * Additional context that the prompt may utilize.
   */
  context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.Obj({
    typename: 'dxos.org/type/Prompt',
    version: '0.1.0',
  }),
);

export interface Prompt extends Schema.Schema.Type<typeof Prompt_> {}
export interface Prompt_Encoded extends Schema.Schema.Encoded<typeof Prompt_> {}
export const Prompt: Schema.Schema<Prompt, Prompt_Encoded> = Prompt_;

export const make = (params: {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  instructions?: string;
  blueprints?: Ref.Ref<Blueprint>[];
  context?: any[];
}): Prompt =>
  Obj.make(Prompt, {
    name: params.name,
    description: params.description,
    input: JsonSchema.toJsonSchema(params.input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(params.output ?? Schema.Void),
    instructions: Template.make({ source: params.instructions }),
    blueprints: params.blueprints ?? [],
    context: params.context ?? [],
  });
