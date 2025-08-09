//
// Copyright 2025 DXOS.org
//

import { type AiError, type AiLanguageModel, type AiTool, type AiToolkit } from '@effect/ai';
import { Effect } from 'effect';

import {
  type AiInputPreprocessingError,
  type AiToolNotFoundError,
  type ToolExecutionService,
  type ToolResolverService,
} from '@dxos/ai';
import { Event } from '@dxos/async';
import { Obj } from '@dxos/echo';
import { type Queue } from '@dxos/echo-db';
import { DatabaseService } from '@dxos/functions';
import { log } from '@dxos/log';
import { DataType } from '@dxos/schema';

import { type AiAssistantError } from '../errors';
import { AiSession, type GenerationObserver } from '../session';

import { AiContextBinder, type ContextBinding } from './context';

export interface AiConversationRunParams<Tools extends AiTool.Any> {
  prompt: string;
  system?: string;
  toolkit?: AiToolkit.AiToolkit<Tools>;

  observer?: GenerationObserver;

  /**
   * @deprecated Remove
   */
  session?: AiSession;
}

export type AiConversationOptions = {
  queue: Queue<DataType.Message | ContextBinding>;
};

/**
 * Persistent conversation state.
 * Context + history + artifacts.
 * Backed by a Queue.
 */
export class AiConversation {
  private readonly _queue: Queue<DataType.Message | ContextBinding>;

  /**
   * Blueprints bound to the conversation.
   */
  public readonly _context: AiContextBinder;

  /**
   * Fired when the execution loop begins.
   * This is called before the first message is sent.
   *
   * @deprecated Pass in a session instead.
   */
  // TODO(burdon): Is this still deprecated?
  public readonly onBegin = new Event<AiSession>();

  constructor(options: AiConversationOptions) {
    this._queue = options.queue;
    this._context = new AiContextBinder(this._queue);
  }

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
  run = <Tools extends AiTool.Any>({
    // TODO(burdon): Decide whether to pass in or to fully encapsulate.
    session = new AiSession(),
    ...params
  }: AiConversationRunParams<Tools>): Effect.Effect<
    DataType.Message[],
    AiAssistantError | AiInputPreprocessingError | AiError.AiError | AiToolNotFoundError,
    AiLanguageModel.AiLanguageModel | ToolResolverService | ToolExecutionService | AiTool.ToHandler<Tools>
  > =>
    Effect.gen(this, function* () {
      const history = yield* Effect.promise(() => this.getHistory());
      const context = yield* Effect.promise(() => this.context.query());
      const blueprints = yield* Effect.forEach(context.blueprints.values(), DatabaseService.load);

      // TODO(burdon): These don't need to be loaded; just need id and typename from context.
      const objects = yield* Effect.forEach(context.objects.values(), DatabaseService.load);

      log.info('run', {
        prompt: params.prompt,
        system: params.system,
        history: history.length,
        objects: objects.length,
        blueprints: blueprints.length,
        toolkit: params.toolkit,
      });

      const start = Date.now();
      this.onBegin.emit(session);

      const messages = yield* session.run({
        prompt: params.prompt,
        system: params.system,
        history,
        objects,
        blueprints,
        toolkit: params.toolkit,
        observer: params.observer,
      });

      log.info('result', { messages: messages, duration: Date.now() - start });
      yield* Effect.promise(() => this._queue.append(messages));
      return messages;
    }).pipe(Effect.withSpan('AiConversation.run'));
}
