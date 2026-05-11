//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Annotation, JsonSchema, Obj, Ref, Type } from '@dxos/echo';

import * as Blueprint from './Blueprint';
import * as Template from './Template';

/**
 * Executable instructions, which may use Blueprints.
 * May reference additional context.
 */
// TODO(burdon): Name?
export const Routine = Schema.Struct({
  /**
   * Name of the routine.
   */
  name: Schema.optional(Schema.String),

  /**
   * Description of the routine's purpose and functionality.
   * Allows AI agents to execute routines automatically as tools.
   */
  description: Schema.optional(Schema.String),

  /**
   * Input schema of the routine.
   */
  input: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Output schema of the routine.
   */
  output: JsonSchema.JsonSchema.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Natural language instructions for the routine.
   * These should provide concrete course of action for the AI to follow.
   */
  // TODO(burdon): Form editor.
  instructions: Template.Template.pipe(Annotation.FormInputAnnotation.set(false)),

  /**
   * Blueprints that the routine may utilize.
   */
  blueprints: Schema.Array(Ref.Ref(Blueprint.Blueprint)),

  /**
   * Additional context that the routine may utilize.
   */
  context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.object({
    typename: 'org.dxos.type.routine',
    version: '0.1.0',
  }),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--scroll--regular',
    hue: 'sky',
  }),
);

export interface Routine extends Schema.Schema.Type<typeof Routine> {}

export const make = (params: {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  instructions?: string;
  blueprints?: Ref.Ref<Blueprint.Blueprint>[];
  context?: any[];
}): Routine =>
  Obj.make(Routine, {
    name: params.name,
    description: params.description,
    input: JsonSchema.toJsonSchema(params.input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(params.output ?? Schema.Void),
    instructions: Template.make({ source: params.instructions }),
    blueprints: params.blueprints ?? [],
    context: params.context ?? [],
  });
