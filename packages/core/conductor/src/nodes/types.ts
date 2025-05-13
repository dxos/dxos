//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
import { Tool, Message } from '@dxos/artifact';
import { type GenerationStreamEvent } from '@dxos/assistant';
import { ObjectId } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../types';
import { StreamSchema } from '../util';

// TODO(burdon): Split up node defs and move types to separate lib package?

//
// Constant
//

// TODO(burdon): Define type.
export const Scalar = Schema.Union(Schema.String, Schema.Number, Schema.Boolean);
export const ConstantOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Scalar });

//
// Queue
//

export const QueueInput = Schema.Struct({ [DEFAULT_INPUT]: ObjectId });
export const QueueOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Message) });

//
// Function
//

export const FunctionInput = Schema.Struct({
  [DEFAULT_INPUT]: Schema.Any,
});
export type FunctionInput = Schema.Schema.Type<typeof FunctionInput>;

export const TemplateInput = Schema.Record({ key: Schema.String, value: Schema.Any });
export type TemplateInput = Schema.Schema.Type<typeof TemplateInput>;

export const TemplateOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any });
export type TemplateOutput = Schema.Schema.Type<typeof TemplateOutput>;

//
// Data
//

export const JsonTransformInput = Schema.Struct({ [DEFAULT_INPUT]: Schema.Any, expression: Schema.String });
export type JsonTransformInput = Schema.Schema.Type<typeof JsonTransformInput>;

export const AppendInput = Schema.Struct({ id: ObjectId, items: Schema.Any });
export type AppendInput = Schema.Schema.Type<typeof AppendInput>;

export const DatabaseOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Tool) });
export type DatabaseOutput = Schema.Schema.Type<typeof DatabaseOutput>;

//
// Logic
//

export const IfInput = Schema.mutable(Schema.Struct({ condition: Schema.Boolean, value: Schema.Any }));
export type IfInput = Schema.Schema.Type<typeof IfInput>;

export const IfOutput = Schema.mutable(Schema.Struct({ true: Schema.optional(Schema.Any), false: Schema.optional(Schema.Any) }));
export type IfOutput = Schema.Schema.Type<typeof IfOutput>;

export const IfElseInput = Schema.mutable(Schema.Struct({ condition: Schema.Boolean, true: Schema.Any, false: Schema.Any }));
export type IfElseInput = Schema.Schema.Type<typeof IfElseInput>;

export const IfElseOutput = Schema.mutable(Schema.Struct({ [DEFAULT_OUTPUT]: Schema.optional(Schema.Any) }));
export type IfElseOutput = Schema.Schema.Type<typeof IfElseOutput>;

//
// Reducer
//

export const ReducerInput = Schema.mutable(Schema.Struct({ values: Schema.Array(Schema.Any) }));
export type ReducerInput = Schema.Schema.Type<typeof ReducerInput>;

export const ReducerOutput = Schema.mutable(Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Any }));
export type ReducerOutput = Schema.Schema.Type<typeof ReducerOutput>;

//
// GPT
//

const GptStreamEventSchema = Schema.Any as Schema.Schema<GenerationStreamEvent>;

export const GptMessage = Schema.Struct({
  role: Schema.Union(Schema.Literal('system'), Schema.Literal('user')),
  message: Schema.String,
});

export type GptMessage = Schema.Schema.Type<typeof GptMessage>;

export const GptInput = Schema.Struct({
  systemPrompt: Schema.optional(Schema.String),
  prompt: Schema.String,
  model: Schema.optional(Schema.String),
  tools: Schema.optional(Schema.Array(Tool)),
  history: Schema.optional(Schema.Array(Message)),
});

export type GptInput = Schema.Schema.Type<typeof GptInput>;

export const GptOutput = Schema.Struct({
  messages: Schema.Array(Message),
  artifact: Schema.optional(Schema.Any),
  text: Schema.String,
  cot: Schema.optional(Schema.String),
  tokenStream: StreamSchema(GptStreamEventSchema),
  tokenCount: Schema.Number,
});

export type GptOutput = Schema.Schema.Type<typeof GptOutput>;

//
// GPT Tools
//

export const TextToImageOutput = Schema.Struct({ [DEFAULT_OUTPUT]: Schema.Array(Tool) });
