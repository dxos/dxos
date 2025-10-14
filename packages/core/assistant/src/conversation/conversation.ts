//
// Copyright 2025 DXOS.org
//

import { type Toolkit } from '@effect/ai';
import * as Array from 'effect/Array';
import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

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

export type AiConversationOptions = {
  queue: Queue<DataType.Message | ContextBinding>;
};

/**
 * Durable conversation state (initiated by users and agents) backed by a Queue.
 * Executes tools based on AI responses and supports cancellation of in-progress requests.
 */
export class AiConversation {
  /**
   * Message and binding queue.
   */
  private readonly _queue: Queue<DataType.Message | ContextBinding>;

  /**
   * Blueprints bound to the conversation.
   */
  private readonly _context: AiContextBinder;

  /**
   * Toolkit from the current session request.
   */
  private _toolkit: Toolkit.WithHandler<any> | undefined;

  public constructor(options: AiConversationOptions) {
    this._queue = options.queue;
    this._context = new AiContextBinder(this._queue);
  }

  public get context() {
    return this._context;
  }

  public get toolkit() {
    return this._toolkit;
  }

  public async getHistory(): Promise<DataType.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(DataType.Message));
  }

  /**
   * Creates a new cancelable request effect.
   */
  createRequest(
    params: AiConversationRunParams,
  ): Effect.Effect<DataType.Message[], AiSessionRunError, AiSessionRunRequirements> {
    return Effect.gen(this, function* () {
      const session = new AiSession();
      const history = yield* Effect.promise(() => this.getHistory());

      // Get context objects.
      const context = yield* Effect.promise(() => this.context.query());
      const blueprints = yield* Effect.forEach(context.blueprints.values(), DatabaseService.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );
      const objects = yield* Effect.forEach(context.objects.values(), DatabaseService.loadOption).pipe(
        Effect.map(Array.filter(Option.isSome)),
        Effect.map(Array.map((option) => option.value)),
      );

      // Create toolkit.
      const toolkit = yield* createToolkit({ blueprints });
      this._toolkit = toolkit;

      const start = Date.now();
      log('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
        tools: this._toolkit?.tools.length ?? 0,
      });

      // Process request.
      const messages = yield* session.run({ history, blueprints, objects, toolkit, ...params }).pipe(
        Effect.provideService(AiContextService, {
          binder: this.context,
        }),
      );

      log('result', { messages: messages.length, duration: Date.now() - start });

      // Append to queue.
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('AiConversation.request'));
  }
}
