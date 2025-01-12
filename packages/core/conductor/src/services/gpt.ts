//
// Copyright 2025 DXOS.org
//

import { Context, type Effect, type Scope } from 'effect';

import { LLMTool, Message, type ResultStreamEvent } from '@dxos/assistant';
import { S } from '@dxos/echo-schema';

import type { ComputeRequirements, NotExecuted, ValueBag } from '../schema';
import { StreamSchema } from '../schema-dsl';

const GptStreamEventSchema = S.Any as S.Schema<ResultStreamEvent>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  tools: S.optional(S.Array(LLMTool)),
  history: S.optional(S.Array(Message)),
});

export type GptInput = S.Schema.Type<typeof GptInput>;

export const GptOutput = S.Struct({
  messages: S.Array(Message),
  cot: S.optional(S.String),
  artifact: S.optional(S.Any),
  tokenStream: StreamSchema(GptStreamEventSchema),
  text: S.String,
  tokenCount: S.Number,
});

export type GptOutput = S.Schema.Type<typeof GptOutput>;

export class GptService extends Context.Tag('GptService')<
  GptService,
  {
    readonly invoke: (
      input: ValueBag<GptInput>,
    ) => Effect.Effect<ValueBag<GptOutput>, Error | NotExecuted, ComputeRequirements>;
  }
>() {}
