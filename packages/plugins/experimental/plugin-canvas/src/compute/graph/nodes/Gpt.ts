//
// Copyright 2025 DXOS.org
//

import { LLMTool } from '@dxos/assistant';
import { type Context } from '@dxos/context';
import { S } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';

import { Function, type FunctionCallback } from './Function';
import { type StateMachineContext } from '../state-machine';

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

export const GptOutput = S.Struct({
  result: S.Array(GptMessage),
  artifact: S.optional(S.Any),
  cot: S.optional(S.String),
  tokens: S.Number,
});

export type GptInput = S.Schema.Type<typeof GptInput>;
export type GptOutput = S.Schema.Type<typeof GptOutput>;

export class GptFunction extends Function<GptInput, GptOutput> {
  constructor() {
    super(GptInput, GptOutput, 'GPT');
  }

  _cb?: FunctionCallback<GptInput, GptOutput>;

  protected override onInitialize(ctx: Context, context: StateMachineContext) {
    invariant(context.gpt);
    this._cb = context.gpt.invoke.bind(context.gpt);
  }

  override async invoke(input: GptInput) {
    invariant(this._cb);
    return this._cb!(input);
  }
}