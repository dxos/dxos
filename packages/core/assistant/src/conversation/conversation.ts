//
// Copyright 2025 DXOS.org
//

import type * as Toolkit from '@effect/ai/Toolkit';
import * as Effect from 'effect/Effect';

import { Resource } from '@dxos/context';
import { type Database, Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
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
   * Blueprints and objects bound to the conversation.
   */
  private readonly _binder: AiContextBinder;

  public constructor(
    private readonly _db: Database.Database,
    private readonly _queue: Queue<Message.Message | ContextBinding>,
    private readonly _toolkit?: Toolkit.Any,
  ) {
    super();
    invariant(this._db);
    invariant(this._queue);
    this._binder = new AiContextBinder(this._db, this._queue);
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

      // Create toolkit.
      const blueprints = self.context.blueprints.value;
      const toolkit = yield* createToolkit({
        toolkit: self._toolkit,
        blueprints,
      });

      // Context objects.
      const objects = self.context.objects.value;

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
