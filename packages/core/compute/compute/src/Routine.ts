//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { DXN, Annotation, JsonSchema, Obj, Ref, Type } from '@dxos/echo';

import * as Blueprint from './Blueprint';
import * as Template from './Template';

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
  // TODO(burdon): Form editor.
  instructions: Template.Template.pipe(Annotation.FormInputAnnotation.set(false)).annotations({
    description: 'Agent instructions',
  }),
  blueprints: Schema.Array(Ref.Ref(Blueprint.Blueprint)),
  // TODO(burdon): Change to map?
  context: Schema.Array(Schema.Any).pipe(Annotation.FormInputAnnotation.set(false)),
}).pipe(
  Type.object(DXN.make('org.dxos.type.routine', '0.1.0')),
  Annotation.LabelAnnotation.set(['name']),
  Annotation.IconAnnotation.set({
    icon: 'ph--scroll--regular',
    hue: 'sky',
  }),
);

export interface Routine extends Schema.Schema.Type<typeof Routine> {}

export type MakeOptions = {
  name?: string;
  description?: string;
  input?: Schema.Schema.AnyNoContext;
  output?: Schema.Schema.AnyNoContext;
  instructions?: string;
  blueprints?: Ref.Ref<Blueprint.Blueprint>[];
  context?: any[];
};

export const make = ({
  name,
  description,
  input,
  output,
  instructions,
  blueprints = [],
  context = [],
}: MakeOptions): Routine =>
  Obj.make(Routine, {
    name,
    description,
    input: JsonSchema.toJsonSchema(input ?? Schema.Void),
    output: JsonSchema.toJsonSchema(output ?? Schema.Void),
    instructions: Template.make({ source: instructions }),
    blueprints,
    context,
  });
