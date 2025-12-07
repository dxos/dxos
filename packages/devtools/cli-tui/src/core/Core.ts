//
// Copyright 2025 DXOS.org
//

import * as Cause from 'effect/Cause';
import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Fiber from 'effect/Fiber';
import * as Runtime from 'effect/Runtime';

import { AiService, type ModelName } from '@dxos/ai';
import { AiConversation, type AiConversationRunParams } from '@dxos/assistant';
import { Client, Config } from '@dxos/client';
import { Context } from '@dxos/context';
import { throwCause } from '@dxos/effect';
import { invariant } from '@dxos/invariant';
import { type Message } from '@dxos/types';

import { type AiChatServices } from './services';

export * from './services';

/**
 * CLI internal state.
 */
export class Core extends Context {
  private readonly _ctx = new Context();

  private _client?: Client;
  private _conversation?: AiConversation;

  constructor(
    private _services: Runtime.Runtime<AiChatServices>,
    private _model: ModelName,
  ) {
    super();
  }

  get client(): Client | undefined {
    return this._client;
  }

  get model(): ModelName {
    return this._model;
  }

  get conversation(): AiConversation | undefined {
    return this._conversation;
  }

  async open(): Promise<void> {
    const config = new Config();
    this._client = new Client({ config });
    await this._client.initialize();
    const identity = this._client.halo.identity.get();
    if (!identity?.identityKey) {
      await this._client.halo.createIdentity();
    }

    await this._client.spaces.waitUntilReady();
    const space = this._client.spaces.default;
    const queue = space.queues.create<Message.Message>();
    this._conversation = new AiConversation(queue);
  }

  async close(): Promise<void> {
    await this._conversation?.close();
    await this._client?.destroy();
    await this._ctx.dispose();
    this._conversation = undefined;
    this._client = undefined;
  }

  async request(params: AiConversationRunParams) {
    invariant(this._conversation);
    const request = this._conversation.createRequest(params);
    const fiber = request.pipe(
      Effect.provide(AiService.model(this._model)),
      Effect.asVoid,
      Runtime.runFork(this._services),
    );

    const response = await fiber.pipe(Fiber.join, Effect.runPromiseExit);
    if (!Exit.isSuccess(response) && !Cause.isInterruptedOnly(response.cause)) {
      throwCause(response.cause);
    }
  }
}
