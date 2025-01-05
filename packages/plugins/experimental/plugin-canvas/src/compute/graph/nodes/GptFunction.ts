//
// Copyright 2025 DXOS.org
//

import {
  runLLM,
  AIServiceClientImpl,
  type LLMToolDefinition,
  type Message,
  ObjectId, // TODO(burdon): Reconcile with echo-schema.
} from '@dxos/assistant';
import { SpaceId } from '@dxos/client/echo';
import { type Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNotNullOrUndefined } from '@dxos/util';

import { Function, type FunctionCallback } from './Function';
import { GptInput, GptOutput } from '../../shapes';
import { type StateMachineContext } from '../state-machine';

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
