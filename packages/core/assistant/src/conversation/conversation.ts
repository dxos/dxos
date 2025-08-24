//
// Copyright 2025 DXOS.org
//

import { type AiTool, type AiToolkit } from '@effect/ai';
import { Effect } from 'effect';

import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { type AiSession, type AiSessionRunEffect, type GenerationObserver } from '../session';

import { AiContextBinder, type ContextBinding } from './context';

export interface AiConversationRunParams<Tools extends AiTool.Any> {
  session: AiSession;
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
  private readonly _queue: Queue<DataType.Message | ContextBinding>;

  /**
   * Blueprints bound to the conversation.
   */
  public readonly _context: AiContextBinder;

  constructor(options: AiConversationOptions) {
    this._queue = options.queue;
    this._context = new AiContextBinder(this._queue);
  }

  // TODO(burdon): Add Space to context?
  get context() {
    return this._context;
  }

  async getHistory(): Promise<DataType.Message[]> {
    const queueItems = await this._queue.queryObjects();
    return queueItems.filter(Obj.instanceOf(DataType.Message));
  }

  /**
   * Executes a prompt.
   * Each invocation creates a new `AiSession`, which handles potential tool calls.
   */
  run = <Tools extends AiTool.Any>({ session, ...params }: AiConversationRunParams<Tools>): AiSessionRunEffect<Tools> =>
    Effect.gen(this, function* () {
      const history = yield* Effect.promise(() => this.getHistory());

      // Context.
      const context = yield* Effect.promise(() => this.context.query());
      const blueprints = yield* Effect.forEach(context.blueprints.values(), DatabaseService.load);
      // TODO(burdon): These don't need to be loaded; just need id and typename from context.
      const objects = yield* Effect.forEach(context.objects.values(), DatabaseService.load);

      log.info('run', {
        history: history.length,
        blueprints: blueprints.length,
        objects: objects.length,
      });

      // Process request.
      const start = Date.now();
      const messages = yield* session.run({ ...params, history, objects, blueprints });
      log.info('result', { messages: messages, duration: Date.now() - start });
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('AiConversation.run'));
}
