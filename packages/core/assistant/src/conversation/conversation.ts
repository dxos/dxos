//
// Copyright 2025 DXOS.org
//

import type * as Toolkit from '@effect/ai/Toolkit';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Resource } from '@dxos/context';
import { Database, Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { log } from '@dxos/log';
import { Message } from '@dxos/types';

import {
  AiSession,
  type AiSessionRunError,
  type AiSessionRunRequirements,
  type GenerationObserver,
  createToolkit,
} from '../session';

import { AiContextBinder, AiContextService, type ContextBinding } from './context';

export interface AiConversationRunParams {
  prompt: string;
  system?: string;
  observer?: GenerationObserver;
}

/**
 * Durable conversation state (initiated by users and agents) backed by a Queue.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class AiConversation extends Resource {
  /**
   * Message and binding queue.
   */
  private readonly _queue: Queue<Message.Message | ContextBinding>;

  /**
   * Toolkit from the current session request.
   */
  private readonly _toolkit?: Toolkit.Any;

  /**
   * Blueprints bound to the conversation.
   */
  private readonly _binder: AiContextBinder;

  public constructor(queue: Queue<Message.Message | ContextBinding>, toolkit?: Toolkit.Any) {
    super();
    this._queue = queue;
    this._toolkit = toolkit;
    this._binder = new AiContextBinder(this._queue);
  }

  protected override async _open(): Promise<void> {
    await this._binder.open(this._ctx);
  }

  public get queue() {
    return this._queue;
  }

  public get context() {
    return this._binder;
  }

  public get toolkit() {
    return this._toolkit;
  }

  public async getHistory(): Promise<Message.Message[]> {
    const queueItems = await this._queue.queryObjects(); // TODO(burdon): Update.
    return queueItems.filter(Obj.instanceOf(Message.Message));
  }

  /**
   * Creates a new cancelable request effect.
   */
  public createRequest(
    params: AiConversationRunParams,
  ): Effect.Effect<Message.Message[], AiSessionRunError, AiSessionRunRequirements> {
    const self = this;
    return Effect.gen(function* () {
      const history = yield* Effect.promise(() => self.getHistory());
      const bindings = yield* Effect.promise(() => self.context.query());

      // Context objects.
      const objects = yield* Effect.forEach(bindings.objects.values(), Database.Service.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      // Create toolkit.
      const blueprints = yield* Effect.forEach(bindings.blueprints.values(), Database.Service.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      const toolkit = yield* createToolkit({
        toolkit: self._toolkit,
        blueprints,
      });

      log.info('run', {
        history: history.length,
        blueprints: blueprints.length,
        tools: Object.keys(toolkit.tools).length,
        objects: objects.length,
      });

      // Process request.
      const session = new AiSession();
      const messages = yield* session.run({ history, blueprints, toolkit, objects, ...params }).pipe(
        Effect.provideService(AiContextService, {
          binder: self.context,
        }),
      );

      log.info('result', {
        messages: messages.length,
        duration: session.duration,
        toolCalls: session.toolCalls,
      });

      // Append to queue.
      yield* Effect.promise(() => self._queue.append(messages));
      return messages;
    });
  }
}
