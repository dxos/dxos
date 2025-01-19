//
// Copyright 2025 DXOS.org
//

import { LLMTool } from '@dxos/assistant';
import { S } from '@dxos/echo-schema';

// TODO(burdon): Move to @dxos/conductor.

//
// Default
//

export const DEFAULT_INPUT = 'input';
export const DEFAULT_OUTPUT = 'result';

export const DefaultInput = S.Struct({ [DEFAULT_INPUT]: S.Any });
export const DefaultOutput = S.Struct({ [DEFAULT_OUTPUT]: S.Any });

export type DefaultInput<T> = { [DEFAULT_INPUT]: T };
export type DefaultOutput<T> = { [DEFAULT_OUTPUT]: T };

//
// Void
//

export const VoidInput = S.Struct({});
export const VoidOutput = S.Struct({});

export type VoidInput = S.Schema.Type<typeof VoidInput>;
export type VoidOutput = S.Schema.Type<typeof VoidOutput>;

//
// GPT
//

export const GptMessage = S.Struct({
  role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
  message: S.String,
});

export type GptMessage = S.Schema.Type<typeof GptMessage>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  model: S.optional(S.String),
  history: S.optional(S.Array(GptMessage)),
  tools: S.optional(S.Array(S.Union(LLMTool, S.Null))),
});

export type GptInput = S.Schema.Type<typeof GptInput>;

export const GptOutput = S.Struct({
  result: S.Array(GptMessage),
  artifact: S.optional(S.Any),
  cot: S.optional(S.String),
  tokens: S.Number,
});

export type GptOutput = S.Schema.Type<typeof GptOutput>;

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

export const ReduceInput = S.mutable(S.Struct({ values: S.Array(S.Any) }));
export type ReduceInput = S.Schema.Type<typeof ReduceInput>;

export const ReduceOutput = S.mutable(S.Struct({ [DEFAULT_OUTPUT]: S.Any }));
export type ReduceOutput = S.Schema.Type<typeof ReduceOutput>;
