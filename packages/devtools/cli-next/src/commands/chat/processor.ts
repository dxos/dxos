//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Layer from 'effect/Layer';
import * as Runtime from 'effect/Runtime';

import { AiService, type ModelName } from '@dxos/ai';
import {
  AiConversation,
  type AiSessionRunError,
  type AiSessionRunRequirements,
  type GenericToolkit,
} from '@dxos/assistant';
import { type Space } from '@dxos/client/echo';
import { throwCause } from '@dxos/effect';
import { type Message } from '@dxos/types';

import { type AiChatServices } from '../../util';

// TODO(burdon): Factor out common guts from assistant plugin and from Chat component.
export class ChatProcessor {
  constructor(
    private readonly _runtime: Runtime.Runtime<AiChatServices>,
    private readonly _metadata?: AiService.Metadata,
    private readonly _toolkit?: GenericToolkit.GenericToolkit,
  ) {}

  get runtime() {
    return this._runtime;
  }

  get toolkit() {
    return this._toolkit;
  }

  get metadata() {
    return this._metadata;
  }

  async execute(
    request: Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements>,
    model: ModelName,
  ) {
    const fiber = request.pipe(
      Effect.provide(AiService.model(model)),
      Effect.provide(this.toolkit?.layer ?? Layer.empty),
      Effect.asVoid,
      Runtime.runFork(this.runtime),
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
      throwCause(response.cause);
    }
  }

  async createConversation(space: Space) {
    const queue = space.queues.create<Message.Message>();
    return new AiConversation(queue, this._toolkit?.toolkit);
  }
}
