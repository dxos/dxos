//
// Copyright 2025 DXOS.org
//

import { type AiTool, type AiToolkit } from '@effect/ai';
import { Array, Effect, Option } from 'effect';

import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { AiSession, type AiSessionRunError, type AiSessionRunRequirements, type GenerationObserver } from '../session';

import { AiContextBinder, AiContextService, type ContextBinding } from './context';
import { AiConversationRequest } from './request';

export interface AiConversationRunParams<Tools extends AiTool.Any> {
  prompt: string;
  system?: string;
  toolkit?: AiToolkit.AiToolkit<Tools>;
  observer?: GenerationObserver;
}

export type AiConversationOptions = {
  queue: Queue<DataType.Message | ContextBinding>;
};

/**
 * Durable conversation state (initiated by users and agents) backed by a Queue.
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

  public constructor(options: AiConversationOptions) {
    this._queue = options.queue;
    this._context = new AiContextBinder(this._queue);
  }

  public get context() {
    return this._context;
  }

  public async getHistory(): Promise<DataType.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(DataType.Message));
  }

  /**
   * Creates a new cancelable request.
   */
  public createRequest<Tools extends AiTool.Any>(params: AiConversationRunParams<Tools>) {
    const session = new AiSession();
    return new AiConversationRequest<Tools>(this.exec<Tools>({ session, ...params }), session);
  }

  /**
   * Executes a request.
   */
  exec<Tools extends AiTool.Any>({
    session,
    ...params
  }: AiConversationRunParams<Tools> & { session: AiSession }): Effect.Effect<
    DataType.Message[],
    AiSessionRunError,
    AiSessionRunRequirements<Tools>
  > {
    return Effect.gen(this, function* () {
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

      const start = Date.now();
      log.info('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
      });

      // Process request.
      const messages = yield* session.run({ ...params, history, blueprints, objects }).pipe(
        Effect.provideService(AiContextService, {
          binder: this.context,
        }),
      );

      log.info('result', { messages: messages.length, duration: Date.now() - start });

      // Append to queue.
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('AiConversation.exec'));
  }
}
