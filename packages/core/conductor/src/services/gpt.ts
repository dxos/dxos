//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { LLMTool, Message, type ResultStreamEvent } from '@dxos/assistant';
import { S } from '@dxos/echo-schema';

import type { ComputeEffect, ValueBag } from '../types';
import { StreamSchema } from '../util';

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
  artifact: S.optional(S.Any),
  text: S.String,
  cot: S.optional(S.String),
  tokenStream: StreamSchema(GptStreamEventSchema),
  tokenCount: S.Number,
});

export type GptOutput = S.Schema.Type<typeof GptOutput>;

export class GptService extends Context.Tag('GptService')<
  GptService,
  {
    readonly invoke: (input: ValueBag<GptInput>) => ComputeEffect<ValueBag<GptOutput>>;
  }
>() {}
