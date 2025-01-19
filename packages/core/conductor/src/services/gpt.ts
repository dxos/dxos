//
// Copyright 2025 DXOS.org
//

import { Context } from 'effect';

import { ImageSource, LLMTool, Message, type AIServiceClient, type ResultStreamEvent } from '@dxos/assistant';
import { ECHO_ATTR_TYPE, S } from '@dxos/echo-schema';

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

export const IMAGE_TYPENAME = 'example.org/type/Image';

export const Image = S.Struct({
  id: S.String,
  prompt: S.String,
  source: ImageSource,
});

export type Image = S.Schema.Type<typeof Image>;

export const isImage = (value: any): value is Image => value?.[ECHO_ATTR_TYPE] === IMAGE_TYPENAME;

export class GptService extends Context.Tag('GptService')<
  GptService,
  {
    readonly invoke: (input: ValueBag<GptInput>) => ComputeEffect<ValueBag<GptOutput>>;
    readonly getAiServiceClient?: () => AIServiceClient;
  }
>() {}
