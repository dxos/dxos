//
// Copyright 2025 DXOS.org
//

import {
  runLLM,
  AIServiceClientImpl,
  LLMToolDefinition,
  type Message,
  ObjectId, // TODO(burdon): Reconcile with echo-schema.
} from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';

import { Function, type FunctionCallback } from './Function';
import { type StateMachineContext } from '../state-machine';
import { AST, S } from '@dxos/echo-schema';

export const GptMessage = S.Struct({
  role: S.Union(S.Literal('system'), S.Literal('user'), S.Literal('assistant')),
  message: S.String,
});

export type GptMessage = S.Schema.Type<typeof GptMessage>;

export const GptInput = S.Struct({
  systemPrompt: S.optional(S.String),
  prompt: S.String,
  history: S.optional(S.Array(GptMessage)),
  tools: S.optional(S.Array(LLMToolDefinition)),
});

export const GptOutput = S.Struct({
  result: S.Array(GptMessage),
  tokens: S.Number,
  cot: S.optional(S.String),
  artifact: S.optional(S.Any),
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
    this._cb = context.gpt;
  }

  override async invoke(input: GptInput) {
    invariant(this._cb);
    return this._cb!(input);
  }
}
