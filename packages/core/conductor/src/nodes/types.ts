//
// Copyright 2025 DXOS.org
//

import { LLMTool, Message, type ResultStreamEvent } from '@dxos/assistant';
import { ObjectId, S } from '@dxos/echo-schema';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '../types';
import { StreamSchema } from '../util';

// TODO(burdon): Split up node defs and move types to separate lib package?

//
// Misc
//

export const ListInput = S.Struct({ [DEFAULT_INPUT]: ObjectId });
export const ListOutput = S.Struct({ id: ObjectId, items: S.Array(Message) });

export const AppendInput = S.Struct({ id: ObjectId, items: S.Array(Message) });

export const DatabaseOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });

export const TextToImageOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Array(LLMTool) });

//
// GPT
//

const GptStreamEventSchema = S.Any as S.Schema<ResultStreamEvent>;

export const GptMessage = S.Struct({
  role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
  message: S.String,
});

export type GptMessage = S.Schema.Type<typeof GptMessage>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  model: S.optional(S.String),
  tools: S.optional(S.Array(LLMTool)),
  history: S.optional(S.Array(Message)),
});

export type GptInput = S.Schema.Type<typeof GptInput>;

export const GptOutput = S.Struct({
  messages: S.Array(Message),
  artifact: S.optional(S.Any),
  text: S.String,
  cot: S.optional(S.String),
  tokenStream: StreamSchema(GptStreamEventSchema),
  tokenCount: S.Number,
});

export type GptOutput = S.Schema.Type<typeof GptOutput>;

//
// Boolean
//

//
// Logic
//

export const IfInput = S.mutable(S.Struct({ condition: S.Boolean, value: S.Any }));
export type IfInput = S.Schema.Type<typeof IfInput>;

export const IfOutput = S.mutable(S.Struct({ true: S.optional(S.Any), false: S.optional(S.Any) }));
export type IfOutput = S.Schema.Type<typeof IfOutput>;

export const IfElseInput = S.mutable(S.Struct({ condition: S.Boolean, true: S.Any, false: S.Any }));
export type IfElseInput = S.Schema.Type<typeof IfElseInput>;

export const IfElseOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.optional(S.Any) }));
export type IfElseOutput = S.Schema.Type<typeof IfElseOutput>;

//
// Reducer
//

export const ReducerInput = S.mutable(S.Struct({ values: S.Array(S.Any) }));
export type ReducerInput = S.Schema.Type<typeof ReducerInput>;

export const ReducerOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.Any }));
export type ReducerOutput = S.Schema.Type<typeof ReducerOutput>;
